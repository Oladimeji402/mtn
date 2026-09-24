/**
 * Shares data by driving the myMTN NG Android app (package ng.mtn.nextgen) over adb, one Android
 * user profile per SIM, all on one Android device or emulator. Each profile is logged in to myMTN
 * with its own number; switching profile needs no OTP.
 *
 * Which profile holds which SIM is read from the phone: every Android profile is opened and the
 * number myMTN shows on its More screen is taken. New profiles are picked up while running, so
 * adding a SIM is: new profile, log in to myMTN, add the number in Admin > SIMs. To pin the
 * mapping instead: MYMTN_PROFILES='{"08031234567":10,"08037654321":0}' (SIM -> Android user id).
 *
 * Verified by hand on myMTN NG 2.0.31 (2026-09-24): Share Data asks for no PIN and has no
 * confirmation step, so tapping "Share 5 GB" sends immediately. That is why everything before
 * that tap is checked from the screen (right SIM, right recipient, right amount) and why an
 * error after it is never called a failure.
 *
 * The home screen never goes idle (a rotating banner), so uiautomator can't read it. The route
 * avoids it: More tab (fixed position) -> "Share" tab -> "Share Airtime/Data" -> Share Now.
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PKG = "ng.mtn.nextgen";
const DUMP_PATH = "/data/local/tmp/mymtn-ui.xml";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The only amounts the app offers, keyed by the plan's size_in_mb. */
export const AMOUNT_LABELS = { 100: "100 MB", 200: "200 MB", 500: "500 MB", 1000: "1 GB", 2000: "2 GB", 3000: "3 GB", 5000: "5 GB" };

/** Screens that mean the profile is no longer logged in. */
const LOGGED_OUT_TEXT = /let['’]?s get started|^log ?in$|^sign ?in$|enter your (mtn |phone )?number/i;

/** Thrown only when the transfer certainly did NOT happen (the Share button was never tapped). */
export class NotSentError extends Error {
  constructor(code, message) {
    super(message);
    this.notSent = true;
    this.code = code;
  }
}

const digits = (s) => String(s ?? "").replace(/\D/g, "");

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** uiautomator XML -> flat list of nodes with the few fields the flow needs. */
export function parseUiXml(xml) {
  const nodes = [];
  for (const m of String(xml).matchAll(/<node\b([^>]*?)\/?>/g)) {
    const a = {};
    for (const [, k, v] of m[1].matchAll(/([\w-]+)="([^"]*)"/g)) a[k] = decodeEntities(v);
    const b = (a.bounds ?? "").match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!b) continue;
    const [x1, y1, x2, y2] = b.slice(1).map(Number);
    const text = (a.text ?? "").trim();
    const desc = (a["content-desc"] ?? "").trim();
    nodes.push({ text, desc, label: text || desc, cls: a.class ?? "", enabled: a.enabled !== "false", x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) });
  }
  return nodes;
}

const byLabel = (nodes, label) => nodes.find((n) => n.text === label || n.desc === label);
const hasLabel = (nodes, label) => !!byLabel(nodes, label);
const texts = (nodes) => nodes.map((n) => n.label).filter(Boolean);

/** "230 MB" / "1.5 GB" -> MB (GB counted as 1024MB, as MTN does). null if unreadable. */
export function parseBalanceMb(text) {
  const m = String(text ?? "").trim().match(/^([\d,]+(?:\.\d+)?)\s*(KB|MB|GB|TB)$/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return { KB: n / 1024, MB: n, GB: n * 1024, TB: n * 1024 * 1024 }[m[2].toUpperCase()];
}
const labelMb = (label) => parseBalanceMb(label);

function defaultAdb(adbPath, serial) {
  return (args, { timeoutMs = 30000, binary = false } = {}) =>
    new Promise((resolve, reject) => {
      execFile(
        adbPath,
        [...(serial ? ["-s", serial] : []), ...args],
        { timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024, encoding: binary ? "buffer" : "utf8" },
        (err, stdout) => (err ? reject(new Error(`adb ${args.slice(0, 3).join(" ")} failed: ${err.message.split("\n")[0]}`)) : resolve(stdout)),
      );
    });
}

export function createMyMtnAppDriver(config, deps = {}) {
  const env = config.env;
  let profiles;
  try {
    profiles = JSON.parse(env.MYMTN_PROFILES || "{}");
  } catch {
    throw new Error("MYMTN_PROFILES must be JSON like {\"08031234567\":10}");
  }
  for (const [sim, user] of Object.entries(profiles)) {
    if (!/^0\d{10}$/.test(sim) || !Number.isInteger(user) || user < 0) throw new Error(`MYMTN_PROFILES: bad entry ${sim}: ${user}`);
  }

  const adb = deps.adb ?? defaultAdb(env.ADB_PATH || "adb", env.ANDROID_SERIAL);
  const wait = deps.sleep ?? sleep;
  const now = deps.now ?? Date.now;
  const t = {
    appStart: Number(env.MYMTN_APP_START_MS || 8000),
    moreTimeout: Number(env.MYMTN_MORE_TIMEOUT_MS || 60000),
    step: Number(env.MYMTN_STEP_TIMEOUT_MS || 15000),
    // Nothing is sent if the preparation runs past this; the server's lease is 300s.
    prep: Number(env.MYMTN_PREP_TIMEOUT_MS || 150000),
    result: Number(env.MYMTN_RESULT_TIMEOUT_MS || 60000),
    poll: Number(env.MYMTN_POLL_MS || 1000),
    healthEveryMs: Number(env.MYMTN_HEALTH_CHECK_HOURS ?? 24) * 3600e3,
    downRecheckMs: Number(env.MYMTN_DOWN_RECHECK_MINUTES || 30) * 60e3,
  };
  const screensDir = path.join(config.stateDir, "screens");
  // Goes through every step and check, then stops just before the Share tap. Sends nothing.
  const dryRun = env.MYMTN_DRY_RUN === "1";

  const fixedProfiles = Object.keys(profiles).length > 0;
  const userOf = new Map(Object.entries(profiles)); // SIM -> Android user id
  const unreadable = new Map(); // user id -> when we last failed to read a number from it
  let discovered = fixedProfiles;

  // SIM health, kept in memory: a SIM found logged out stops taking orders until a check passes.
  const health = new Map(Object.keys(profiles).map((sim) => [sim, { down: null, checkedAt: 0 }]));
  const alerts = [];

  function markDown(sim, reason) {
    const h = health.get(sim);
    if (!h || h.down) return;
    h.down = reason;
    alerts.push({ msisdn: sim, reason: `SIM ${sim} stopped taking orders: ${reason}` });
  }
  function markUp(sim) {
    const h = health.get(sim);
    if (!h) return;
    if (h.down) alerts.push({ msisdn: sim, reason: `SIM ${sim} is working again and taking orders.` });
    h.down = null;
    h.checkedAt = now();
  }

  // ---- screen primitives --------------------------------------------------------------
  async function dump() {
    // rm first: a failed dump must never be answered by the previous screen's file.
    const xml = await adb(["shell", `rm -f ${DUMP_PATH}; uiautomator dump ${DUMP_PATH} >/dev/null 2>&1; cat ${DUMP_PATH} 2>/dev/null; true`], { timeoutMs: 30000 }).catch(() => "");
    return xml.includes("<hierarchy") ? parseUiXml(xml) : null;
  }
  // Android's "myMTN NG isn't responding  [Close app] [Wait]". Only ever "Wait": it just lets the
  // app carry on, so it is safe even after the Share tap. Before the tap, a third one gives up.
  let anrs = 0;
  const isAnr = (nodes) => nodes.some((n) => /isn['’]t responding/i.test(n.label)) && hasLabel(nodes, "Wait");
  async function read({ beforeShare = true } = {}) {
    const nodes = await dump();
    if (!nodes || !isAnr(nodes)) return nodes;
    anrs++;
    await tap(byLabel(nodes, "Wait"));
    if (beforeShare && anrs >= 3) throw new NotSentError("APP_FROZE", "myMTN kept freezing (Android's \"isn't responding\" dialog)");
    await wait(2000);
    return null;
  }

  async function waitFor(check, timeoutMs, deadline = Infinity) {
    const end = Math.min(now() + timeoutMs, deadline);
    let last = null;
    for (;;) {
      const nodes = await read();
      if (nodes) {
        last = nodes;
        if (nodes.some((n) => LOGGED_OUT_TEXT.test(n.label))) return { nodes, loggedOut: true };
        const hit = check(nodes);
        if (hit) return { nodes, hit };
      }
      if (now() >= end) return { nodes: last, hit: null };
      await wait(t.poll);
    }
  }
  const tap = (n) => adb(["shell", "input", "tap", String(n.x), String(n.y)]);
  async function screenshot(name) {
    try {
      fs.mkdirSync(screensDir, { recursive: true });
      const png = await adb(["exec-out", "screencap", "-p"], { binary: true, timeoutMs: 20000 });
      const file = path.join(screensDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${name}.png`);
      fs.writeFileSync(file, png);
      return file;
    } catch {
      return null;
    }
  }

  let moreTab = null;
  async function moreTabPoint() {
    if (moreTab) return moreTab;
    if (env.MYMTN_MORE_TAB) {
      const [x, y] = env.MYMTN_MORE_TAB.split(",").map(Number);
      return (moreTab = { x, y });
    }
    const size = (await adb(["shell", "wm", "size"])).match(/(\d+)x(\d+)\s*$/m);
    const [w, h] = size ? [Number(size[1]), Number(size[2])] : [1080, 2400];
    // Bottom-right tab of myMTN's nav bar (measured at 970,2256 on 1080x2400).
    return (moreTab = { x: Math.round(w * 0.898), y: Math.round(h * 0.94) });
  }

  // ---- navigation ---------------------------------------------------------------------
  async function listUsers() {
    const out = await adb(["shell", "pm", "list", "users"]);
    return [...String(out).matchAll(/UserInfo\{(\d+):/g)].map((m) => Number(m[1]));
  }

  /** Opens a profile's myMTN and reads which number it is logged in as. */
  async function discoverUser(user) {
    try {
      const nodes = await openAsUser(user, now() + t.prep);
      const sim = nodes.map((n) => digits(n.text)).find((d) => /^0\d{10}$/.test(d));
      if (!sim) throw new NotSentError("NAVIGATION", "No phone number on myMTN's More screen");
      for (const [other, u] of userOf) if (u === user && other !== sim) userOf.delete(other) && health.delete(other);
      userOf.set(sim, user);
      unreadable.delete(user);
      if (!health.has(sim)) health.set(sim, { down: null, checkedAt: now() });
      else markUp(sim);
      return sim;
    } catch (err) {
      unreadable.set(user, now());
      if (err.code === "LOGGED_OUT") for (const [sim, u] of userOf) if (u === user) markDown(sim, err.message);
      return null;
    }
  }

  async function openAsSim(sim, deadline) {
    const user = userOf.get(sim);
    if (user === undefined) throw new NotSentError("NOT_CONFIGURED", `No Android profile on the gateway phone is logged in as ${sim}`);
    const more = await openAsUser(user, deadline);
    if (!more.some((n) => digits(n.text) === sim)) {
      throw new NotSentError("WRONG_ACCOUNT", `Profile ${user} is logged in as a different number than ${sim}`);
    }
    return more;
  }

  async function openAsUser(user, deadline) {
    const current = Number(String(await adb(["shell", "am", "get-current-user"])).trim());
    if (current !== user) {
      await adb(["shell", "am", "switch-user", String(user)]);
      const end = now() + 30000;
      while (Number(String(await adb(["shell", "am", "get-current-user"])).trim()) !== user) {
        if (now() > end) throw new NotSentError("PROFILE_SWITCH", `Android profile ${user} did not come up`);
        await wait(1000);
      }
      await wait(3000);
    }
    // A fresh start every time, so a screen left over from last time can't be misread. Closing it
    // in every profile also keeps only one copy of myMTN in memory.
    anrs = 0;
    await adb(["shell", "am", "force-stop", "--user", "all", PKG]);
    await adb(["shell", "am", "start", "--user", String(user), "-n", `${PKG}/.MainActivity`]);
    await wait(t.appStart);

    // More tab -> account screen, which shows the logged-in number. The app takes ~15-25s to
    // start taking taps, and until the More screen is up every read fails (the home screen
    // never idles), so: tap More, read, repeat. Tapping More on the More screen is harmless.
    const end = Math.min(now() + t.moreTimeout, deadline);
    let more = null;
    for (;;) {
      await tap(await moreTabPoint());
      await wait(1500);
      const nodes = await read();
      if (nodes?.some((n) => LOGGED_OUT_TEXT.test(n.label))) throw new NotSentError("LOGGED_OUT", "myMTN is logged out in this profile");
      if (nodes && hasLabel(nodes, "My Account") && hasLabel(nodes, "Rewards")) {
        more = nodes;
        break;
      }
      if (now() >= end) throw new NotSentError("NAVIGATION", `Could not open myMTN's More screen (saw: ${texts(nodes ?? []).slice(0, 8).join(" | ") || "nothing readable"})`);
    }
    return more;
  }

  async function tapLabel(nodes, label) {
    const n = byLabel(nodes, label);
    if (!n) throw new NotSentError("NAVIGATION", `"${label}" not found on screen`);
    await tap(n);
  }
  async function expect(check, what, deadline) {
    const r = await waitFor(check, t.step, deadline);
    if (r.loggedOut) throw new NotSentError("LOGGED_OUT", "myMTN is logged out in this profile");
    if (!r.hit) throw new NotSentError("NAVIGATION", `${what} did not appear (saw: ${texts(r.nodes ?? []).slice(0, 8).join(" | ")})`);
    return r;
  }

  async function typeRecipient(nodes, recipient) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const field = nodes.find((n) => n.cls === "android.widget.EditText");
      if (!field) throw new NotSentError("NAVIGATION", "Phone number field not found");
      await tap(field);
      await wait(800);
      if (attempt > 0) await adb(["shell", "input", "keyevent", "KEYCODE_MOVE_END", ...Array(15).fill("KEYCODE_DEL")]);
      // One digit at a time: the field reformats as you type and drops characters sent in a burst.
      for (const d of recipient) {
        await adb(["shell", "input", "text", d]);
        await wait(250);
      }
      await wait(1000);
      const r = await expect((n) => n.find((x) => x.cls === "android.widget.EditText"), "Phone number field", Infinity);
      nodes = r.nodes;
      if (digits(r.hit.text) === recipient) return nodes;
    }
    throw new NotSentError("INPUT_MISMATCH", "The recipient number did not type in correctly");
  }

  // ---- the transfer -----------------------------------------------------------------------
  async function transfer({ sourceMsisdn, recipientMsisdn, amountMb, jobId = "try" }) {
    const label = AMOUNT_LABELS[amountMb];
    if (!label) throw new NotSentError("AMOUNT", `myMTN can't share ${amountMb}MB (options: ${Object.values(AMOUNT_LABELS).join(", ")})`);
    if (!/^0\d{10}$/.test(recipientMsisdn)) throw new NotSentError("RECIPIENT", `Not a valid number: ${recipientMsisdn}`);

    const deadline = now() + t.prep;
    let nodes;
    let shareButton;
    try {
      nodes = await openAsSim(sourceMsisdn, deadline);
      await tapLabel(nodes, "Share");
      ({ nodes } = await expect((n) => hasLabel(n, "Share Airtime/Data"), "Share Airtime/Data", deadline));
      await tapLabel(nodes, "Share Airtime/Data");
      ({ nodes } = await expect((n) => hasLabel(n, "Share Data") && hasLabel(n, "Share Airtime") && hasLabel(n, "Share Now"), "MTN Share", deadline));

      // The first "Share Now" sits between the Share Data and Share Airtime headers.
      const top = byLabel(nodes, "Share Data").y;
      const bottom = byLabel(nodes, "Share Airtime").y;
      const shareNow = nodes.find((n) => n.label === "Share Now" && n.y > top && n.y < bottom);
      if (!shareNow) throw new NotSentError("NAVIGATION", "Share Data's Share Now button not found");
      await tap(shareNow);

      ({ nodes } = await expect((n) => hasLabel(n, "Share Data From:") && n.some((x) => x.cls === "android.widget.EditText"), "Share Data form", deadline));
      if (!nodes.some((n) => digits(n.text) === sourceMsisdn)) throw new NotSentError("WRONG_ACCOUNT", `Share Data is not sending from ${sourceMsisdn}`);

      // Data left must cover the share plus the 100MB MTN makes you keep.
      const balance = nodes.map((n) => parseBalanceMb(n.text)).find((v) => v != null);
      const short = balance != null && balance < labelMb(label) + 100;
      if (short && !dryRun) {
        return { outcome: "insufficient_bundle", replyText: `Not sent: ${sourceMsisdn} has ${balance}MB, needs ${labelMb(label) + 100}MB` };
      }

      nodes = await typeRecipient(nodes, recipientMsisdn);
      await tapLabel(nodes, "Choose Data Amount");
      ({ nodes } = await expect((n) => n.find((x) => x.desc === label), "Amount picker", deadline));
      const tile = nodes.find((n) => n.desc === label);
      if (!tile.enabled && !dryRun) return { outcome: "insufficient_bundle", replyText: `Not sent: myMTN greys out ${label} for ${sourceMsisdn}` };
      await tap(tile);

      // Last look before the one irreversible tap.
      const buttonLabel = `Share ${label}`;
      ({ nodes } = await expect((n) => hasLabel(n, buttonLabel), `"${buttonLabel}" button`, deadline));
      const field = nodes.find((n) => n.cls === "android.widget.EditText");
      if (field && digits(field.text) !== recipientMsisdn) throw new NotSentError("INPUT_MISMATCH", "Recipient changed before sending");
      if (now() > deadline) throw new NotSentError("TIMEOUT", "Took too long to prepare; not sending this late");
      shareButton = byLabel(nodes, buttonLabel);
      if (dryRun) {
        await adb(["shell", "am", "force-stop", "--user", "all", PKG]);
        const note = short || !tile.enabled ? ` (a real run would stop earlier: balance ${balance}MB${tile.enabled ? "" : `, ${label} greyed out`})` : "";
        throw new NotSentError("DRY_RUN", `Dry run: sender, recipient and "${buttonLabel}" all checked; stopped before tapping${note}`);
      }
    } catch (err) {
      if (err.notSent) {
        if (["LOGGED_OUT", "WRONG_ACCOUNT", "NOT_CONFIGURED"].includes(err.code)) markDown(sourceMsisdn, err.message);
        await screenshot(`${jobId}-not-sent-${err.code}`);
        throw err;
      }
      // An adb or device failure before the tap: still certainly not sent.
      throw new NotSentError("DEVICE", err.message);
    }

    // ---- from here the data may have moved: never report a failure, only what the screen says
    try {
      await tap(shareButton);
    } catch (err) {
      // The tap may still have reached the app.
      return { replyText: `Share tap reported an error, outcome unknown: ${err.message}` };
    }
    markUp(sourceMsisdn);
    const end = now() + t.result;
    let prev = null;
    for (;;) {
      await wait(1500);
      const n = await read({ beforeShare: false });
      if (n) {
        const all = texts(n);
        if (all.includes("Successful")) {
          const joined = all.join(" | ");
          const ok = all.some((s) => digits(s).endsWith(sourceMsisdn)) && all.some((s) => digits(s).endsWith(recipientMsisdn)) && all.includes(label);
          if (!ok) await screenshot(`${jobId}-success-mismatch`);
          return ok ? { outcome: "success", replyText: joined } : { replyText: `Success screen did not match the order: ${joined}` };
        }
        // Finished on some other screen: the picker has closed and the screen has settled.
        const pickerOpen = n.some((x) => Object.values(AMOUNT_LABELS).includes(x.desc));
        const sig = all.join("|");
        if (!pickerOpen && sig && sig === prev) {
          await screenshot(`${jobId}-result`);
          return { replyText: all.join(" | ") };
        }
        prev = sig;
      }
      if (now() > end) {
        await screenshot(`${jobId}-no-result`);
        return { replyText: `No result screen within ${t.result / 1000}s${n ? `: ${texts(n).join(" | ")}` : ""}` };
      }
    }
  }

  /** Opens a SIM's profile and confirms it is logged in as that number. Sends nothing. */
  async function check(sim) {
    try {
      await openAsSim(sim, now() + t.prep);
      markUp(sim);
      return { sim, ok: true };
    } catch (err) {
      if (err.notSent && ["LOGGED_OUT", "WRONG_ACCOUNT", "NOT_CONFIGURED"].includes(err.code)) markDown(sim, err.message);
      else health.get(sim).checkedAt = now();
      return { sim, ok: false, reason: err.message };
    }
  }

  return {
    name: "mymtn-app",
    // Success is decided by the driver from the result screen, never by a text pattern.
    defaultPatterns: { success: [], limit: [], bundle: [], failed: [] },
    alerts,
    async liveSims() {
      if (!discovered) {
        discovered = true;
        for (const user of await listUsers()) await discoverUser(user);
      }
      return [...health].filter(([, h]) => !h.down).map(([sim]) => sim);
    },
    transfer,
    check,
    /** Called between jobs: re-checks one SIM that is due, which also keeps its login in use. */
    async idle() {
      if (!fixedProfiles) {
        // A profile added since start (or one that couldn't be read last time): find its number.
        const mapped = new Set(userOf.values());
        const fresh = (await listUsers()).find((u) => !mapped.has(u) && now() - (unreadable.get(u) ?? -Infinity) >= t.downRecheckMs);
        if (fresh !== undefined) return void (await discoverUser(fresh));
      }
      const due = [...health].find(([, h]) => now() - h.checkedAt >= (h.down ? t.downRecheckMs : t.healthEveryMs));
      if (due && (t.healthEveryMs > 0 || due[1].down)) await check(due[0]);
    },
    async close() {},
  };
}
