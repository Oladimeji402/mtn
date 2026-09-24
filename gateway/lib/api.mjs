/** Thin client for the website's /api/gateway/* endpoints. */
export function createApi(config, fetchImpl = fetch) {
  async function post(path, body, timeoutMs = 20000) {
    const res = await fetchImpl(`${config.serverUrl}/api/gateway/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 401) throw new Error("Server rejected the gateway token (check GATEWAY_TOKEN)");
    if (!res.ok) throw new Error(`Server returned ${res.status} for ${path}`);
    return res.json();
  }

  return {
    heartbeat: (liveSims, alerts = []) => post("heartbeat", { gatewayId: config.gatewayId, liveSims, alerts }),
    claim: (liveSims) => post("claim", { gatewayId: config.gatewayId, liveSims }),
    report: (jobId, outcome, message) => post("report", { jobId, outcome, message }),
  };
}
