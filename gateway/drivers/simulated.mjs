/**
 * No hardware needed. Pretends to be N SIMs so the whole flow can be exercised end to end.
 * SIM_NUMBERS=08000000001,08000000002   SIM_BEHAVIOR=success|limit|bundle|fail|unknown|hang
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const defaultPatterns = {
  success: ["SIMULATED_SUCCESS"],
  limit: ["SIMULATED_LIMIT"],
  bundle: ["SIMULATED_NO_DATA"],
  failed: ["SIMULATED_FAILED"],
};

export function createSimulatedDriver(config) {
  const sims = (config.env.SIM_NUMBERS || "").split(",").map((s) => s.trim()).filter(Boolean);
  // SIM_LIMIT_SIMS makes just those SIMs answer "daily limit reached", to exercise rotation.
  const limitSims = (config.env.SIM_LIMIT_SIMS || "").split(",").map((x) => x.trim()).filter(Boolean);
  const behavior = (sim) => (limitSims.includes(sim) ? "limit" : config.env.SIM_BEHAVIOR || "success");
  return {
    name: "simulated",
    defaultPatterns,
    async liveSims() {
      return sims;
    },
    async transfer({ sourceMsisdn, recipientMsisdn, amountMb }) {
      await sleep(Number(config.env.SIM_DELAY_MS || 800));
      const b = behavior(sourceMsisdn);
      if (b === "hang") await sleep(10 * 60 * 1000);
      const replies = {
        success: `SIMULATED_SUCCESS ${amountMb}MB sent from ${sourceMsisdn} to ${recipientMsisdn}`,
        limit: "SIMULATED_LIMIT daily limit reached",
        bundle: "SIMULATED_NO_DATA insufficient data balance",
        fail: "SIMULATED_FAILED invalid number",
        unknown: "Something unexpected",
      };
      return { replyText: replies[b] ?? replies.unknown };
    },
    async close() {},
  };
}
