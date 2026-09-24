import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "../lib/config.mjs";
import { createState } from "../lib/state.mjs";
import { handleJob } from "../lib/run.mjs";
import { createMyMtnAppDriver, parseUiXml, parseBalanceMb, NotSentError } from "../drivers/mymtn-app.mjs";

const SIM = "08031234567";
const OTHER = "08037654321";
const TO = "08031112222";

// ---- a fake phone running a scripted myMTN ---------------------------------------------
// Screens are lists of nodes (one per row: taps are matched by height only); a node with `go`
// changes the screen when tapped. The fake counts
// taps on the final "Share …" button, which is the one action that moves real data.
function node(label, { desc = false, cls = "android.widget.TextView", enabled = true, y, go } = {}) {
  return { text: desc ? "" : label, desc: desc ? label : "", cls, enabled, y, go };
}

function fakePhone(opts = {}) {
  const o = {
    loggedInAs: { 10: SIM, 0: OTHER },
    loggedOut: false,
    balance: "6 GB",
    disabledTiles: [],
    typo: 0, // how many typing attempts come out wrong
    result: "success", // success | mismatch | error | spinner
    anrOn: null, // screen that shows Android's "isn't responding" dialog
    anrTimes: 0,
    ...opts,
  };
  const s = { user: 0, screen: "launcher", field: "", amount: null, shareTaps: 0, typed: 0, anr: 0, log: [] };

  const screens = {
    home: () => null, // never idle: uiautomator can't read it
    welcome: () => [node("Let’s get started", { y: 2000 })],
    more: () => [
      node("Ada Obi", { y: 280 }),
      node(o.loggedInAs[s.user] ?? "", { y: 340 }),
      node("My Account", { y: 560 }),
      node("Share", { y: 626, go: "moreShare" }),
      node("Rewards", { y: 690 }),
      node("Log Out", { y: 1586, go: "LOGGED_OUT_BY_TEST" }),
    ],
    moreShare: () => [node("My Account", { y: 560 }), node("Share", { y: 626 }), node("Rewards", { y: 690 }), node("Share Airtime/Data", { y: 900, go: "mtnShare" })],
    mtnShare: () => [
      node("MTN Share", { y: 180 }),
      node("Share Data", { y: 820 }),
      node("Share Now", { desc: true, cls: "android.widget.Button", y: 1148, go: "form" }),
      node("Share Airtime", { y: 1325 }),
      node("Share Now", { desc: true, cls: "android.widget.Button", y: 1620, go: "WRONG_SHARE_NOW" }),
    ],
    form: () => [
      node("Share Data", { y: 180 }),
      node("Share Data From:", { y: 268 }),
      node(o.loggedInAs[s.user], { y: 418 }),
      node(o.balance, { y: 382 }),
      node(s.field || "080X XXXX XXX", { cls: "android.widget.EditText", y: 1460, go: "form" }),
      node("Choose Data Amount", { desc: true, y: 2192, go: "picker" }),
    ],
    picker: () => [
      ...screens.form(),
      ...["100 MB", "200 MB", "500 MB", "1 GB", "2 GB", "3 GB", "5 GB"].map((l, i) => ({ ...node(l, { desc: true, cls: "android.view.ViewGroup", enabled: !o.disabledTiles.includes(l), y: 1520 + i * 50 }), pick: l })),
      node(`Share ${s.amount ?? "0 MB"}`, { desc: true, y: 2232, go: "SEND" }),
    ],
    sending: () => [...screens.picker().filter((n) => n.go !== "SEND"), node("", { desc: true, y: 2232 })],
    success: () => [
      node("Successful", { y: 800 }),
      node("Shared From", { y: 976 }),
      node(`Ada-${o.loggedInAs[s.user]}`, { y: 976 }),
      node("Shared To", { y: 1072 }),
      node(`UnKnown-${o.result === "mismatch" ? "08000000000" : TO}`, { y: 1072 }),
      node("Shared Data", { y: 1168 }),
      node(` ${s.amount}`, { y: 1168 }),
    ],
    error: () => [node("Oops!", { y: 800 }), node("You have exceeded your daily share limit", { y: 900 })],
  };

  const xml = (nodes) =>
    `<?xml version='1.0' ?><hierarchy rotation="0">${nodes
      .map((n, i) => `<node index="${i}" text="${n.text.replace(/&/g, "&amp;")}" class="${n.cls}" content-desc="${n.desc}" enabled="${n.enabled}" bounds="[0,${n.y - 20}][1080,${n.y + 20}]" />`)
      .join("")}</hierarchy>`;

  const anrDialog = () => [node("myMTN NG isn't responding", { y: 1100 }), node("Close app", { y: 1233, go: "CLOSE_APP" }), node("Wait", { y: 1359, go: "WAIT" })];
  const showing = () => (s.screen === o.anrOn && s.anr < o.anrTimes ? anrDialog() : screens[s.screen]?.());

  function tapAt(y) {
    const nodes = showing();
    if (nodes?.[0]?.text.includes("isn't responding")) {
      const hit = nodes.find((n) => Math.abs(n.y - y) <= 20);
      if (hit?.go === "WAIT") s.anr++;
      else throw new Error(`test tapped ${hit?.go ?? "outside the dialog"} on the ANR dialog`);
      return;
    }
    if (s.screen === "home" || s.screen === "moreShare" || s.screen === "more") {
      if (y === Math.round(2400 * 0.94)) {
        s.screen = o.loggedOut || o.loggedOutUsers?.includes(s.user) ? "welcome" : "more";
        return;
      }
    }
    const hit = nodes?.find((n) => Math.abs(n.y - y) <= 20);
    if (!hit) return;
    if (hit.pick) {
      if (hit.enabled) s.amount = hit.pick;
      return;
    }
    if (hit.go === "SEND") {
      s.shareTaps++;
      s.screen = o.result === "spinner" ? "sending" : o.result === "error" ? "error" : "success";
      return;
    }
    if (hit.go && hit.go.toUpperCase() === hit.go) throw new Error(`test tapped forbidden target ${hit.go}`);
    if (hit.go) s.screen = hit.go;
  }

  async function adb(args) {
    s.log.push(args.join(" "));
    const [a0, a1, a2, a3] = args;
    if (a0 === "exec-out") return Buffer.from("png");
    if (a0 !== "shell") throw new Error("unexpected adb call");
    if (a1 === "am" && a2 === "get-current-user") return `${s.user}\n`;
    if (a1 === "am" && a2 === "switch-user") return void (s.user = Number(a3));
    if (a1 === "am" && a2 === "force-stop") return void (s.screen = "launcher");
    if (a1 === "am" && a2 === "start") return void (s.screen = o.loggedOut || o.loggedOutUsers?.includes(s.user) ? "welcome" : "home");
    if (a1 === "wm") return "Physical size: 1080x2400\n";
    if (a1 === "pm" && a2 === "list") return Object.keys(o.loggedInAs).map((u) => `\tUserInfo{${u}:P${u}:c13} running`).join("\n");
    if (a1 === "input" && a2 === "tap") return void tapAt(Number(args[4]));
    if (a1 === "input" && a2 === "text") {
      s.field += a3;
      if (s.field.length === 11 && s.typed++ < o.typo) s.field = s.field.slice(1) + "9";
      return;
    }
    if (a1 === "input" && a2 === "keyevent") return void (s.field = "");
    if (a1.startsWith("rm -f")) {
      const nodes = showing();
      return nodes ? xml(nodes) : "";
    }
    throw new Error(`unexpected adb shell ${a1}`);
  }
  return { adb, s, o };
}

function driverFor(phone, env = {}) {
  let clock = 0;
  const config = loadConfig(
    { DRIVER: "mymtn-app", STATE_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "mymtn-")), MYMTN_PROFILES: JSON.stringify({ [SIM]: 10, [OTHER]: 0 }), ...env },
    { server: false },
  );
  const d = createMyMtnAppDriver(config, { adb: phone.adb, sleep: async (ms) => void (clock += ms), now: () => clock });
  d.tick = (ms) => void (clock += ms);
  return d;
}
const order = { sourceMsisdn: SIM, recipientMsisdn: TO, amountMb: 5000 };

// ---- parsing ------------------------------------------------------------------------------
test("app: balances are read in MB, GB as 1024MB", () => {
  assert.equal(parseBalanceMb("230 MB"), 230);
  assert.equal(parseBalanceMb("1.5 GB"), 1536);
  assert.equal(parseBalanceMb("1,024.5 MB"), 1024.5);
  assert.equal(parseBalanceMb("Share 5 GB"), null);
});
test("app: uiautomator XML is parsed, entities decoded, centers computed", () => {
  const [n] = parseUiXml('<node text="Date &amp; Time" content-desc="" class="x" enabled="false" bounds="[0,10][100,30]" />');
  assert.deepEqual(n, { text: "Date & Time", desc: "", label: "Date & Time", cls: "x", enabled: false, x: 50, y: 20 });
});

// ---- the flow -----------------------------------------------------------------------------
test("app: a verified success screen is 'success', and Share is tapped exactly once", async () => {
  const phone = fakePhone();
  const r = await driverFor(phone).transfer(order);
  assert.equal(r.outcome, "success");
  assert.equal(phone.s.shareTaps, 1);
  assert.equal(phone.s.user, 10, "switched to the SIM's own profile");
});
test("app: a success screen naming a different recipient is NOT a success", async () => {
  const phone = fakePhone({ result: "mismatch" });
  const r = await driverFor(phone).transfer(order);
  assert.equal(r.outcome, undefined);
  assert.match(r.replyText, /did not match/);
});
test("app: an unrecognised result screen comes back as text for the patterns (so 'unknown' by default)", async () => {
  const phone = fakePhone({ result: "error" });
  const r = await driverFor(phone).transfer(order);
  assert.equal(r.outcome, undefined);
  assert.match(r.replyText, /daily share limit/);
  assert.equal(phone.s.shareTaps, 1);
});
test("app: a spinner that never finishes is reported as no result (never a failure)", async () => {
  const phone = fakePhone({ result: "spinner" });
  const r = await driverFor(phone).transfer(order);
  assert.equal(r.outcome, undefined);
  assert.match(r.replyText, /No result screen/);
});
test("app: wrong number in the profile -> not sent, SIM taken out of service with an alert", async () => {
  const phone = fakePhone({ loggedInAs: { 10: "09999999999", 0: OTHER } });
  const d = driverFor(phone);
  await assert.rejects(d.transfer(order), (e) => e instanceof NotSentError && e.code === "WRONG_ACCOUNT");
  assert.equal(phone.s.shareTaps, 0);
  assert.deepEqual(await d.liveSims(), [OTHER]);
  assert.match(d.alerts[0].reason, /stopped taking orders/);
});
test("app: a logged-out profile -> not sent, SIM out of service until a check passes", async () => {
  const phone = fakePhone({ loggedOut: true });
  const d = driverFor(phone);
  await assert.rejects(d.transfer(order), (e) => e.code === "LOGGED_OUT");
  assert.equal(phone.s.shareTaps, 0);
  assert.deepEqual(await d.liveSims(), [OTHER]);

  phone.o.loggedOut = false; // someone logs the profile back in
  assert.equal((await d.check(SIM)).ok, true);
  assert.deepEqual((await d.liveSims()).sort(), [OTHER, SIM].sort());
  assert.deepEqual(d.alerts.map((a) => a.reason.includes("working again")), [false, true]);
});
test("app: not enough data (keeping MTN's 100MB) -> insufficient_bundle without tapping Share", async () => {
  const phone = fakePhone({ balance: "5 GB" }); // 5120MB < 5120 + 100
  const r = await driverFor(phone).transfer(order);
  assert.equal(r.outcome, "insufficient_bundle");
  assert.equal(phone.s.shareTaps, 0);
});
test("app: a greyed-out amount tile -> insufficient_bundle without tapping Share", async () => {
  const phone = fakePhone({ disabledTiles: ["5 GB"] });
  const r = await driverFor(phone).transfer(order);
  assert.equal(r.outcome, "insufficient_bundle");
  assert.equal(phone.s.shareTaps, 0);
});
test("app: a mistyped recipient is retyped once; still wrong -> not sent", async () => {
  const once = fakePhone({ typo: 1 });
  assert.equal((await driverFor(once).transfer(order)).outcome, "success");
  const always = fakePhone({ typo: 5 });
  await assert.rejects(driverFor(always).transfer(order), (e) => e.code === "INPUT_MISMATCH");
  assert.equal(always.s.shareTaps, 0);
});
test("app: amounts the app doesn't offer are refused before touching the phone", async () => {
  const phone = fakePhone();
  await assert.rejects(driverFor(phone).transfer({ ...order, amountMb: 4000 }), (e) => e.code === "AMOUNT");
  assert.equal(phone.s.log.length, 0);
});
test("app: never taps Log Out or Share Airtime's button", async () => {
  // fakePhone throws if a forbidden target is tapped; a full run must not trip it
  const phone = fakePhone();
  await driverFor(phone).transfer(order);
  assert.equal(phone.s.shareTaps, 1);
});
test("app: preparation that overruns its deadline is never sent late", async () => {
  const phone = fakePhone();
  const r = driverFor(phone, { MYMTN_PREP_TIMEOUT_MS: "16000" }).transfer(order);
  await assert.rejects(r, (e) => e.notSent && e.code === "TIMEOUT");
  assert.equal(phone.s.shareTaps, 0);
});

test("app: a dry run checks everything and stops before the Share tap", async () => {
  const phone = fakePhone({ balance: "130 MB" });
  await assert.rejects(driverFor(phone, { MYMTN_DRY_RUN: "1" }).transfer(order), (e) => e.code === "DRY_RUN" && /balance 130MB/.test(e.message));
  assert.equal(phone.s.shareTaps, 0);
  assert.equal(phone.s.amount, "5 GB", "went as far as choosing the amount");
});

test("app: an 'isn't responding' dialog is answered with Wait and the order goes on", async () => {
  const phone = fakePhone({ anrOn: "form", anrTimes: 1 });
  assert.equal((await driverFor(phone).transfer(order)).outcome, "success");
  assert.equal(phone.s.anr, 1);
});
test("app: myMTN that keeps freezing before Share -> not sent", async () => {
  const phone = fakePhone({ anrOn: "form", anrTimes: 5 });
  await assert.rejects(driverFor(phone).transfer(order), (e) => e.code === "APP_FROZE");
  assert.equal(phone.s.shareTaps, 0);
});
test("app: a freeze after Share is waited out (never 'Close app') and the result still read", async () => {
  const phone = fakePhone({ anrOn: "success", anrTimes: 2 });
  assert.equal((await driverFor(phone).transfer(order)).outcome, "success");
  assert.equal(phone.s.shareTaps, 1);
});

test("app: with no MYMTN_PROFILES, each profile's number is read off the phone", async () => {
  const phone = fakePhone({ loggedInAs: { 0: OTHER, 10: SIM, 11: "08055555555" }, loggedOutUsers: [11] });
  const d = driverFor(phone, { MYMTN_PROFILES: "" });
  assert.deepEqual((await d.liveSims()).sort(), [OTHER, SIM].sort(), "the logged-out profile 11 is not offered");
  assert.equal((await d.transfer(order)).outcome, "success");
  assert.equal(phone.s.user, 10);

  // profile 11 gets logged in later; an idle pass (after the recheck interval) picks it up
  phone.o.loggedOutUsers = [];
  await d.idle(); // too soon: 30 min recheck
  assert.equal((await d.liveSims()).length, 2);
  d.tick(31 * 60e3);
  await d.idle();
  assert.deepEqual((await d.liveSims()).sort(), [OTHER, SIM, "08055555555"].sort());
});

// ---- the run loop's side -----------------------------------------------------------------
test("run: a not-sent error is reported as 'not_sent' so the server can move the order", async () => {
  const c = loadConfig({ SERVER_URL: "https://x.test", GATEWAY_TOKEN: "t".repeat(30), STATE_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "gw-")) });
  const reports = [];
  const driver = { name: "app", transfer: async () => { throw new NotSentError("LOGGED_OUT", "logged out"); } };
  const api = { report: async (id, outcome, message) => reports.push({ id, outcome, message }) };
  const state = createState(c.stateDir);
  await handleJob({ job: { id: "j1", ...order }, config: c, driver, api, state, log: () => {} });
  assert.equal(reports[0].outcome, "not_sent");
  assert.match(reports[0].message, /LOGGED_OUT/);
  assert.equal(state.read(), null);
});
test("run: an outcome decided by the driver is used as-is", async () => {
  const c = loadConfig({ SERVER_URL: "https://x.test", GATEWAY_TOKEN: "t".repeat(30), STATE_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "gw-")) });
  const reports = [];
  const driver = { name: "app", transfer: async () => ({ outcome: "success", replyText: "Successful | …" }) };
  await handleJob({ job: { id: "j1", ...order }, config: c, driver, api: { report: async (id, outcome) => reports.push(outcome) }, state: createState(c.stateDir), log: () => {} });
  assert.deepEqual(reports, ["success"]);
});
