#!/usr/bin/env node
import readline from "node:readline/promises";
import { loadConfig, buildUssd } from "./lib/config.mjs";
import { createApi } from "./lib/api.mjs";
import { createState } from "./lib/state.mjs";
import { classify } from "./lib/classify.mjs";
import { run, effectivePatterns } from "./lib/run.mjs";
import { createSimulatedDriver } from "./drivers/simulated.mjs";
import { createAtModemDriver } from "./drivers/at-modem.mjs";
import { createMyMtnAppDriver } from "./drivers/mymtn-app.mjs";

function makeDriver(config) {
  if (config.driver === "simulated") return createSimulatedDriver(config);
  if (config.driver === "at-modem") return createAtModemDriver(config);
  if (config.driver === "mymtn-app") return createMyMtnAppDriver(config);
  throw new Error(`Unknown DRIVER "${config.driver}" (use simulated, at-modem or mymtn-app)`);
}

/** npm run try <simNumber> <recipientNumber> <amountMb> — one real transfer, no server involved. */
async function tryOnce(args) {
  const [sim, recipient, amount] = args.filter((a) => !a.startsWith("--"));
  if (!sim || !recipient || !amount) {
    console.log("Usage: npm run try -- <simNumber> <recipientNumber> <amountMb> [--yes]");
    process.exit(1);
  }
  const config = loadConfig(process.env, { server: false });
  const driver = makeDriver(config);
  const ussd = buildUssd(config, { recipientMsisdn: recipient, amountMb: Number(amount) });

  const how = driver.name === "mymtn-app" ? "share through the myMTN app from" : `dial ${ussd} on`;
  console.log(`\nThis will REALLY ${how} SIM ${sim}, sending ${amount}MB to ${recipient}.`);
  if (!args.includes("--yes")) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question("Type YES to continue: ")).trim();
    rl.close();
    if (answer !== "YES") process.exit(0);
  }
  let result;
  try {
    result = await driver.transfer({ sourceMsisdn: sim, recipientMsisdn: recipient, amountMb: Number(amount), ussd });
  } catch (err) {
    if (!err.notSent) throw err;
    console.log(`\nNOT sent (${err.code}): ${err.message}\n`);
    return driver.close();
  }
  const { replyText, outcome } = result;
  console.log(`\nMTN replied:\n  ${replyText}\n`);
  console.log(`Classified as: ${outcome ?? classify(replyText, effectivePatterns(config, driver))}`);
  console.log("If that is \"unknown\", add a pattern that matches this reply to SUCCESS_PATTERNS / LIMIT_PATTERNS / BUNDLE_PATTERNS / FAILED_PATTERNS.");
  await driver.close();
}

/** npm run check — opens every SIM's profile and confirms it is logged in. Sends nothing. */
async function checkAll() {
  const config = loadConfig(process.env, { server: false });
  const driver = makeDriver(config);
  if (!driver.check) {
    console.log(`The ${driver.name} driver has no check; its live SIMs are: ${(await driver.liveSims()).join(", ") || "none"}`);
    return;
  }
  const sims = await driver.liveSims();
  for (const sim of sims) {
    const r = await driver.check(sim);
    console.log(`${sim}: ${r.ok ? "OK, logged in" : `PROBLEM: ${r.reason}`}`);
  }
  await driver.close();
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === "try") return tryOnce(rest);
  if (command === "check") return checkAll();

  const config = loadConfig();
  const driver = makeDriver(config);
  const api = createApi(config);
  const state = createState(config.stateDir);
  const controller = new AbortController();
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => controller.abort());

  console.log(`Gateway "${config.gatewayId}" starting: driver=${driver.name}, server=${config.serverUrl}`);
  await run({ config, driver, api, state, signal: controller.signal });
  console.log("Gateway stopped.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
