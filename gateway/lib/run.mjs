import { buildUssd } from "./config.mjs";
import { classify } from "./classify.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DRIVER_OUTCOMES = new Set(["success", "failed", "limit_reached", "insufficient_bundle", "unknown"]);

export function effectivePatterns(config, driver) {
  const p = config.patterns;
  const configured = p.success.length || p.limit.length || p.bundle.length || p.failed.length;
  return configured ? p : (driver.defaultPatterns ?? { success: [], limit: [], bundle: [], failed: [] });
}

/** The result must reach the server, or the order stays stuck. Retries with backoff. */
async function reportWithRetry(api, log, jobId, outcome, message, sleepFn = sleep, attempts = 20) {
  let delay = 1000;
  for (let i = 1; i <= attempts; i++) {
    try {
      await api.report(jobId, outcome, message);
      return true;
    } catch (err) {
      log(`report ${jobId} failed (attempt ${i}/${attempts}): ${err.message}`);
      if (i === attempts) return false;
      await sleepFn(delay);
      delay = Math.min(delay * 2, 60000);
    }
  }
  return false;
}

export async function handleJob({ job, config, driver, api, state, log, sleepFn }) {
  const ussd = buildUssd(config, { recipientMsisdn: job.recipientMsisdn, amountMb: job.amountMb });
  // Written BEFORE dialling: if we die from here on, the next start must not dial this again.
  state.write({ id: job.id, source: job.sourceMsisdn, recipient: job.recipientMsisdn, amountMb: job.amountMb });

  let outcome;
  let message;
  try {
    const result = await driver.transfer({
      jobId: job.id,
      sourceMsisdn: job.sourceMsisdn,
      recipientMsisdn: job.recipientMsisdn,
      amountMb: job.amountMb,
      ussd,
    });
    state.logReply({ jobId: job.id, sim: job.sourceMsisdn, ussd, replyText: result.replyText, outcome: result.outcome });
    // A driver that reads a structured result screen decides the outcome itself; otherwise the
    // reply text is matched against the configured patterns.
    outcome = DRIVER_OUTCOMES.has(result.outcome) ? result.outcome : classify(result.replyText, effectivePatterns(config, driver));
    message = String(result.replyText).slice(0, 300);
  } catch (err) {
    if (err.notSent) {
      // The driver guarantees nothing was sent (it never reached the send step), so the
      // server can safely move the order to another SIM.
      outcome = "not_sent";
      message = `Not sent (${err.code}): ${err.message}`.slice(0, 300);
      state.logReply({ jobId: job.id, sim: job.sourceMsisdn, ussd, replyText: message, outcome });
    } else {
      // We can't know whether it was sent, so we never say "failed" here.
      outcome = "unknown";
      message = `Driver error: ${err.message}`;
    }
  }

  log(`job ${job.id}: ${job.sourceMsisdn} -> ${job.recipientMsisdn} ${job.amountMb}MB => ${outcome}`);
  const delivered = await reportWithRetry(api, log, job.id, outcome, message, sleepFn);
  // If the server never heard back, keep the marker so the next start reports "unknown".
  if (delivered) state.clear();
}

export async function run({ config, driver, api, state, signal, log = console.log, sleepFn = sleep }) {
  const stale = state.read();
  if (stale) {
    log(`Found an unfinished transfer for job ${stale.id} from before the last stop. NOT retrying it; reporting "unknown".`);
    const ok = await reportWithRetry(api, log, stale.id, "unknown", "Gateway restarted mid-transfer; not retried", sleepFn);
    if (ok) state.clear();
  }

  let live = [];
  let lastBeat = 0;
  while (!signal.aborted) {
    try {
      if (Date.now() - lastBeat >= config.heartbeatMs) {
        live = await driver.liveSims();
        // SIMs the driver found logged out (or back in): the server tells the admins.
        const alerts = driver.alerts ? driver.alerts.splice(0) : [];
        try {
          await api.heartbeat(live, alerts);
        } catch (err) {
          driver.alerts?.unshift(...alerts);
          throw err;
        }
        lastBeat = Date.now();
      }
      if (live.length) {
        const { job } = await api.claim(live);
        if (job) {
          await handleJob({ job, config, driver, api, state, log, sleepFn });
          lastBeat = 0; // a job can take a SIM out of service: tell the server straight away
          continue;
        }
      }
      // Between jobs: let the driver do upkeep (the app driver re-checks one SIM's login).
      if (driver.idle) await driver.idle();
    } catch (err) {
      log(`loop error: ${err.message}`);
      lastBeat = 0; // force a fresh heartbeat next time
      await sleepFn(Math.max(config.pollMs, 5000));
      continue;
    }
    await sleepFn(config.pollMs);
  }
  await driver.close();
}
