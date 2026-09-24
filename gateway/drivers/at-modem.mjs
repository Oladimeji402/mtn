/**
 * Dials USSD through USB GSM modems using standard AT commands (AT+CUSD). One SIM per modem.
 *
 *   MODEMS='[{"sim":"08031234567","port":"/dev/ttyUSB0"},{"sim":"08039876543","port":"/dev/ttyUSB1"}]'
 *
 * UNTESTED AGAINST REAL HARDWARE: the command sequence follows the 3GPP AT+CUSD standard and is
 * covered by tests against a scripted fake modem, but modems differ. Verify with `npm run try`
 * on one SIM and a tiny amount before trusting it, and check that MTN's reply text is read
 * correctly (see decodeUssd).
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** UCS2 (dcs 72) replies arrive as hex; everything else is already plain text. */
export function decodeUssd(text, dcs) {
  if (Number(dcs) === 72 && /^[0-9A-Fa-f]+$/.test(text) && text.length % 4 === 0) {
    let out = "";
    for (let i = 0; i < text.length; i += 4) out += String.fromCharCode(parseInt(text.slice(i, i + 4), 16));
    return out;
  }
  return text;
}

async function defaultOpenPort(path, baudRate) {
  let SerialPort;
  try {
    ({ SerialPort } = await import("serialport"));
  } catch {
    throw new Error("The at-modem driver needs the 'serialport' package: run `npm install` in gateway/");
  }
  return new Promise((resolve, reject) => {
    const port = new SerialPort({ path, baudRate }, (err) => (err ? reject(err) : resolve(port)));
  });
}

/** One modem: serialises commands and reads line-based replies. */
export function createModem({ path, baudRate = 115200, openPort = defaultOpenPort }) {
  let port = null;
  let buffer = "";
  const waiters = [];
  let chain = Promise.resolve();

  function onData(chunk) {
    buffer += chunk.toString("latin1");
    for (const w of [...waiters]) w();
  }

  async function ensureOpen() {
    if (port) return;
    port = await openPort(path, baudRate);
    port.on("data", onData);
  }

  /** Sends a command and waits until `until` matches the accumulated text (or times out). */
  async function send(cmd, until, timeoutMs) {
    await ensureOpen();
    buffer = "";
    port.write(`${cmd}\r`);
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const m = until.exec(buffer);
      if (m) return { text: buffer, match: m };
      if (/\bERROR\b|\+CME ERROR|\+CMS ERROR/.test(buffer)) throw new Error(`Modem error for ${cmd.split("=")[0]}: ${buffer.trim()}`);
      if (Date.now() > deadline) throw new Error(`Modem timed out waiting for reply to ${cmd.split("=")[0]}`);
      await new Promise((resolve) => {
        const t = setTimeout(done, 100);
        function done() {
          clearTimeout(t);
          waiters.splice(waiters.indexOf(done), 1);
          resolve();
        }
        waiters.push(done);
      });
    }
  }

  const serial = (fn) => {
    const run = chain.then(fn, fn);
    chain = run.catch(() => {});
    return run;
  };

  return {
    /** True when the SIM is registered on the network (home or roaming). */
    registered: () =>
      serial(async () => {
        await send("AT", /OK/, 3000);
        const { match } = await send("AT+CREG?", /\+CREG:\s*\d+,(\d)[\s\S]*OK/, 3000);
        return match[1] === "1" || match[1] === "5";
      }),

    /** Runs one USSD string and returns the network's final reply text. */
    ussd: (code, timeoutMs = 45000) =>
      serial(async () => {
        await send("AT", /OK/, 3000);
        await send('AT+CSCS="GSM"', /OK/, 3000).catch(() => {});
        const { match } = await send(`AT+CUSD=1,"${code}",15`, /\+CUSD:\s*(\d)\s*(?:,\s*"([\s\S]*?)"\s*(?:,\s*(\d+))?)?\s*\r?\n/, timeoutMs);
        const status = Number(match[1]);
        const text = decodeUssd(match[2] ?? "", match[3]);
        // 0 = final message, 1 = network wants a reply (a menu), 2 = session ended by network.
        if (status === 1) await send("AT+CUSD=2", /OK/, 5000).catch(() => {}); // cancel the open session
        return { status, text };
      }),

    close: async () => {
      if (port) await new Promise((r) => port.close(() => r()));
      port = null;
    },
  };
}

export function createAtModemDriver(config, deps = {}) {
  const spec = JSON.parse(config.env.MODEMS || "[]");
  if (!spec.length) throw new Error('DRIVER=at-modem needs MODEMS, e.g. [{"sim":"08031234567","port":"/dev/ttyUSB0"}]');
  const modems = new Map(spec.map((m) => [m.sim, createModem({ path: m.port, baudRate: m.baud, openPort: deps.openPort })]));

  return {
    name: "at-modem",
    defaultPatterns: {},
    async liveSims() {
      const live = [];
      for (const [sim, modem] of modems) {
        try {
          if (await modem.registered()) live.push(sim);
        } catch {
          // modem unplugged or unresponsive: simply not live
        }
      }
      return live;
    },
    async transfer({ sourceMsisdn, ussd }) {
      const modem = modems.get(sourceMsisdn);
      if (!modem) throw new Error(`No modem configured for SIM ${sourceMsisdn}`);
      const { status, text } = await modem.ussd(ussd);
      return { replyText: text, networkStatus: status };
    },
    async close() {
      await Promise.all([...modems.values()].map((m) => m.close()));
    },
  };
}
