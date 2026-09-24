import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { classify } from "../lib/classify.mjs";
import { buildUssd, loadConfig } from "../lib/config.mjs";
import { createState } from "../lib/state.mjs";
import { run, handleJob } from "../lib/run.mjs";
import { createSimulatedDriver } from "../drivers/simulated.mjs";
import { createModem, createAtModemDriver, decodeUssd } from "../drivers/at-modem.mjs";

const baseEnv = { SERVER_URL: "https://x.test", GATEWAY_TOKEN: "t".repeat(30), STATE_DIR: "", DRIVER: "simulated", SIM_NUMBERS: "08000000001", SIM_DELAY_MS: "0", POLL_INTERVAL_MS: "0", HEARTBEAT_INTERVAL_MS: "0" };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "gw-"));
const cfg = (extra = {}) => loadConfig({ ...baseEnv, STATE_DIR: tmp(), ...extra });
const noSleep = async () => {};

// ---- classification: the safe default ------------------------------------------------
test("an unrecognised or empty reply is 'unknown', never a guess", () => {
  const none = { success: [], limit: [], bundle: [], failed: [] };
  assert.equal(classify("Transfer complete!", none), "unknown");
  assert.equal(classify("", none), "unknown");
  assert.equal(classify(undefined, none), "unknown");
});
test("only an explicitly configured pattern produces success", () => {
  assert.equal(classify("You have gifted 5GB", { success: ["gifted \\d+GB"], limit: [], bundle: [], failed: [] }), "success");
});
test("limit/bundle/failed win over a success word in the same reply", () => {
  const p = { success: ["transfer"], limit: ["daily limit"], bundle: ["insufficient"], failed: ["invalid"] };
  assert.equal(classify("Transfer failed: daily limit reached", p), "limit_reached");
  assert.equal(classify("Transfer failed: insufficient data", p), "insufficient_bundle");
  assert.equal(classify("Transfer to invalid number", p), "failed");
});
test("USSD template is filled from the job", () => {
  assert.equal(buildUssd(cfg(), { recipientMsisdn: "08031112222", amountMb: 5000 }), "*312*08031112222*5000#");
  assert.equal(buildUssd(cfg({ AMOUNT_FORMAT: "gb" }), { recipientMsisdn: "0803", amountMb: 5000 }), "*312*0803*5#");
});

// ---- AT modem driver against a scripted fake modem ------------------------------------
function fakePort(script) {
  const port = new EventEmitter();
  port.written = [];
  port.write = (data) => {
    port.written.push(data.trim());
    const reply = script(data.trim());
    if (reply != null) setImmediate(() => port.emit("data", Buffer.from(reply)));
  };
  port.close = (cb) => cb && cb();
  return port;
}
const openWith = (port) => async () => port;

test("modem: dials the USSD and returns the network's final reply", async () => {
  const port = fakePort((cmd) => {
    if (cmd === "AT") return "\r\nOK\r\n";
    if (cmd.startsWith("AT+CSCS")) return "\r\nOK\r\n";
    if (cmd.startsWith("AT+CUSD=1")) return '\r\nOK\r\n\r\n+CUSD: 0,"You have gifted 5GB",15\r\n';
  });
  const modem = createModem({ path: "/dev/x", openPort: openWith(port) });
  const r = await modem.ussd("*312*0803*5000#", 2000);
  assert.deepEqual(r, { status: 0, text: "You have gifted 5GB" });
  assert.ok(port.written.includes('AT+CUSD=1,"*312*0803*5000#",15'));
});
test("modem: an open menu (status 1) is cancelled so the SIM isn't left in a session", async () => {
  const port = fakePort((cmd) => {
    if (cmd === "AT" || cmd.startsWith("AT+CSCS") || cmd === "AT+CUSD=2") return "\r\nOK\r\n";
    if (cmd.startsWith("AT+CUSD=1")) return '\r\n+CUSD: 1,"1. Transfer 2. Request",15\r\n';
  });
  const modem = createModem({ path: "/dev/x", openPort: openWith(port) });
  const r = await modem.ussd("*312#", 2000);
  assert.equal(r.status, 1);
  assert.ok(port.written.includes("AT+CUSD=2"));
});
test("modem: no reply times out with an error (so the job becomes 'unknown', not success)", async () => {
  const port = fakePort((cmd) => (cmd === "AT" || cmd.startsWith("AT+CSCS") ? "\r\nOK\r\n" : null));
  const modem = createModem({ path: "/dev/x", openPort: openWith(port) });
  await assert.rejects(modem.ussd("*312#", 400), /timed out/);
});
test("modem: an AT error is surfaced", async () => {
  const port = fakePort((cmd) => (cmd === "AT" ? "\r\nOK\r\n" : cmd.startsWith("AT+CSCS") ? "\r\nOK\r\n" : "\r\n+CME ERROR: 30\r\n"));
  const modem = createModem({ path: "/dev/x", openPort: openWith(port) });
  await assert.rejects(modem.ussd("*312#", 2000), /Modem error/);
});
test("modem: registered() reads network registration; unregistered SIM is not live", async () => {
  const mk = (n) => fakePort((cmd) => (cmd === "AT" ? "\r\nOK\r\n" : `\r\n+CREG: 0,${n}\r\n\r\nOK\r\n`));
  assert.equal(await createModem({ path: "a", openPort: openWith(mk(1)) }).registered(), true);
  assert.equal(await createModem({ path: "a", openPort: openWith(mk(5)) }).registered(), true);
  assert.equal(await createModem({ path: "a", openPort: openWith(mk(0)) }).registered(), false);
});
test("modem driver: an unplugged modem is simply not live", async () => {
  const c = cfg({ DRIVER: "at-modem", MODEMS: JSON.stringify([{ sim: "08031112222", port: "/dev/gone" }]) });
  const d = createAtModemDriver(c, { openPort: async () => { throw new Error("no such device"); } });
  assert.deepEqual(await d.liveSims(), []);
});
test("UCS2 replies are decoded", () => {
  assert.equal(decodeUssd("00480069", 72), "Hi");
  assert.equal(decodeUssd("Hello", 15), "Hello");
});

// ---- the run loop: the safety properties ----------------------------------------------
function fakeApi({ jobs = [], failReports = 0 } = {}) {
  const calls = { heartbeat: [], claim: 0, report: [] };
  let failsLeft = failReports;
  const ac = new AbortController();
  return {
    calls, ac,
    api: {
      heartbeat: async (live) => { calls.heartbeat.push(live); return { ok: true }; },
      claim: async () => { calls.claim++; return { job: jobs.shift() ?? null }; },
      report: async (id, outcome, message) => {
        if (failsLeft-- > 0) throw new Error("network down");
        calls.report.push({ id, outcome, message });
        ac.abort();
        return { ok: true };
      },
    },
  };
}
const job = { id: "job-1", sourceMsisdn: "08000000001", recipientMsisdn: "08031112222", amountMb: 5000 };

test("run: heartbeat -> claim -> dial -> report success", async () => {
  const c = cfg(); const f = fakeApi({ jobs: [job] });
  await run({ config: c, driver: createSimulatedDriver(c), api: f.api, state: createState(c.stateDir), signal: f.ac.signal, log: () => {}, sleepFn: noSleep });
  assert.deepEqual(f.calls.heartbeat[0], ["08000000001"]);
  assert.equal(f.calls.report[0].outcome, "success");
});
test("run: limit and empty-data replies are reported so the server can move to the next SIM", async () => {
  for (const [behavior, expected] of [["limit", "limit_reached"], ["bundle", "insufficient_bundle"], ["fail", "failed"]]) {
    const c = cfg({ SIM_BEHAVIOR: behavior }); const f = fakeApi({ jobs: [job] });
    await run({ config: c, driver: createSimulatedDriver(c), api: f.api, state: createState(c.stateDir), signal: f.ac.signal, log: () => {}, sleepFn: noSleep });
    assert.equal(f.calls.report[0].outcome, expected, behavior);
  }
});
test("run: a driver error mid-dial is reported as 'unknown', never 'failed'", async () => {
  const c = cfg(); const f = fakeApi({ jobs: [job] });
  const driver = { name: "boom", liveSims: async () => ["08000000001"], transfer: async () => { throw new Error("modem unplugged"); }, close: async () => {} };
  await run({ config: c, driver, api: f.api, state: createState(c.stateDir), signal: f.ac.signal, log: () => {}, sleepFn: noSleep });
  assert.equal(f.calls.report[0].outcome, "unknown");
  assert.match(f.calls.report[0].message, /modem unplugged/);
});
test("run: an unrecognised reply is 'unknown' when no patterns are configured for a real driver", async () => {
  const c = cfg(); const f = fakeApi({ jobs: [job] });
  const driver = { name: "real", liveSims: async () => ["08000000001"], transfer: async () => ({ replyText: "Completed" }), close: async () => {} };
  await run({ config: c, driver, api: f.api, state: createState(c.stateDir), signal: f.ac.signal, log: () => {}, sleepFn: noSleep });
  assert.equal(f.calls.report[0].outcome, "unknown");
});
test("run: a failed report is retried until the server hears it, and the in-flight marker is cleared only then", async () => {
  const c = cfg(); const f = fakeApi({ jobs: [job], failReports: 3 }); const state = createState(c.stateDir);
  await run({ config: c, driver: createSimulatedDriver(c), api: f.api, state, signal: f.ac.signal, log: () => {}, sleepFn: noSleep });
  assert.equal(f.calls.report.length, 1);
  assert.equal(state.read(), null);
});
test("run: if the server can never be reached the marker stays, so a restart reports 'unknown' and never re-dials", async () => {
  const c = cfg(); const state = createState(c.stateDir);
  let dialled = 0;
  const driver = { name: "d", liveSims: async () => ["08000000001"], transfer: async () => { dialled++; return { replyText: "SIMULATED_SUCCESS" }; }, close: async () => {} };
  const deadApi = { report: async () => { throw new Error("offline"); } };
  await handleJob({ job, config: c, driver, api: deadApi, state, log: () => {}, sleepFn: noSleep });
  assert.equal(dialled, 1);
  assert.equal(state.read().id, "job-1");

  // restart: must report unknown and must NOT dial again
  const f = fakeApi({ jobs: [job] });
  await run({ config: c, driver, api: f.api, state, signal: f.ac.signal, log: () => {}, sleepFn: noSleep });
  assert.equal(f.calls.report[0].id, "job-1");
  assert.equal(f.calls.report[0].outcome, "unknown");
  assert.equal(dialled, 1, "the interrupted transfer must never be dialled a second time");
});
test("run: with no live SIMs it does not claim work", async () => {
  const c = cfg({ SIM_NUMBERS: "" }); const f = fakeApi({ jobs: [job] });
  setTimeout(() => f.ac.abort(), 30);
  await run({ config: c, driver: createSimulatedDriver(c), api: f.api, state: createState(c.stateDir), signal: f.ac.signal, log: () => {}, sleepFn: async () => new Promise((r) => setTimeout(r, 5)) });
  assert.equal(f.calls.claim, 0);
});
