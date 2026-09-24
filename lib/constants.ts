export const CURRENT_USER_ID = "usr_1";

export const APP_NAME = "Bunben Data Hub";

// Real client-provided contact details (confirmed 2026-09-15) — not placeholders.
export const SUPPORT_PHONE = "08030859828";
export const SUPPORT_EMAIL = "bunben2023@gmail.com";

/** Tutorial video shown on the home screen — replace the file (same name) to change it. */
export const FUND_WALLET_VIDEO_SRC = "/videos/fund-wallet.mp4";

export const QUICK_FUND_AMOUNTS = [1500, 2000, 5000, 10000, 20000, 50000];

// Client-confirmed values (2026-09-15).
export const MIN_FUNDING_AMOUNT = 1350;
export const MAX_FUNDING_AMOUNT = 135000;

/**
 * Real MTN Nigeria mobile number prefixes, used as a client-side sanity check on purchase
 * phone numbers. This can never be fully authoritative — Nigeria has had mobile number
 * portability since 2013, so a prefix's original carrier doesn't guarantee its current one.
 * The actual backstop is VTU.ng/SMEData.ng's own purchase-time validation, which fails
 * cleanly (and refunds) if a number genuinely isn't MTN — see lib/purchase-fulfillment.ts.
 */
export const MTN_PREFIXES = [
  "0803",
  "0806",
  "0703",
  "0706",
  "0707", // formerly ZoomMobile/Reltel, later absorbed into MTN's range
  "0813",
  "0814",
  "0816",
  "0810",
  "0903",
  "0906",
  "0913",
  "0916",
  "0704",
];
