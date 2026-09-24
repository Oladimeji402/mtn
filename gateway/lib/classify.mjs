/**
 * Turns MTN's reply text into an outcome for the server. THE SAFE DEFAULT IS "unknown".
 *
 * A reply is only called a success if it matches a pattern you explicitly configured after
 * seeing MTN's real wording (npm run try). Anything unrecognised is reported as "unknown",
 * which parks the order for an admin instead of guessing. Guessing wrong in either direction
 * costs money: false success = the customer got nothing, false failure = a free refund.
 *
 * Order matters: failure-type patterns are checked first, so a reply that mentions both a
 * limit and the word "transfer" is never mistaken for a success.
 */
export function classify(replyText, patterns) {
  const text = String(replyText ?? "").trim();
  if (!text) return "unknown";
  const hit = (list) => list.some((p) => new RegExp(p, "i").test(text));
  if (hit(patterns.limit)) return "limit_reached";
  if (hit(patterns.bundle)) return "insufficient_bundle";
  if (hit(patterns.failed)) return "failed";
  if (hit(patterns.success)) return "success";
  return "unknown";
}
