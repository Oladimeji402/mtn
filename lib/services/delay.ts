/**
 * Simulates network latency for mock service calls so loading states are exercised
 * during development. Safe to remove once real API calls replace these functions.
 */
export function simulateDelay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
