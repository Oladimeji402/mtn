import os from "node:os";

const list = (v) => (v ? v.split("||").map((s) => s.trim()).filter(Boolean) : []);

export function loadConfig(env = process.env, { server = true } = {}) {
  const need = (k) => {
    if (!env[k]) throw new Error(`Missing required setting ${k} (see gateway/README.md)`);
    return env[k];
  };
  return {
    serverUrl: server ? need("SERVER_URL").replace(/\/+$/, "") : "",
    token: server ? need("GATEWAY_TOKEN") : "",
    gatewayId: env.GATEWAY_ID || os.hostname(),
    driver: env.DRIVER || "simulated",
    pollMs: Number(env.POLL_INTERVAL_MS || 3000),
    heartbeatMs: Number(env.HEARTBEAT_INTERVAL_MS || 30000),
    stateDir: env.STATE_DIR || "./state",
    // The exact USSD string and how the amount is written MUST be confirmed with one real
    // transfer (npm run try) before going live; these defaults are MTN's published format.
    ussdTemplate: env.USSD_TEMPLATE || "*312*{recipient}*{amount}#",
    amountFormat: env.AMOUNT_FORMAT || "mb", // "mb" -> 5000, "gb" -> 5
    patterns: {
      success: list(env.SUCCESS_PATTERNS),
      limit: list(env.LIMIT_PATTERNS),
      bundle: list(env.BUNDLE_PATTERNS),
      failed: list(env.FAILED_PATTERNS),
    },
    env,
  };
}

export function buildUssd(config, { recipientMsisdn, amountMb }) {
  const amount = config.amountFormat === "gb" ? String(amountMb / 1000) : String(amountMb);
  return config.ussdTemplate.replace("{recipient}", recipientMsisdn).replace("{amount}", amount);
}
