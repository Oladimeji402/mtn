import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js blocks dev-server requests from origins it doesn't recognize by default
  // (DNS-rebinding protection). Needed to test the Monipay redirect/webhook flow via
  // an ngrok tunnel, since Monipay's live API rejects localhost callback URLs.
  allowedDevOrigins: ["*.ngrok-free.app"],

  // Every dashboard route is dynamic (per-user data behind auth) and has a loading.tsx,
  // which by default gives it a 0-second client-side cache (staleTimes.dynamic — dropped
  // from 30s to 0s in Next 15+). That meant every revisit, even hitting Back a second
  // later, was treated as brand new and re-fetched, flashing the loading skeleton again
  // every time. 30s is enough to kill that flash on normal back-and-forth navigation while
  // staying short enough that wallet balance/transactions don't go meaningfully stale —
  // any real mutation (funding, a purchase) still redirects/refreshes through a Server
  // Action, which always hits the server fresh regardless of this cache.
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },

  // Security headers found missing in a pre-launch review. Deliberately NOT setting
  // Strict-Transport-Security here — Vercel adds it automatically on every deployment,
  // and setting it ourselves would also apply in local dev, where a browser that caches
  // an HSTS rule for localhost then refuses to load plain http://localhost afterward.
  // A full Content-Security-Policy was also considered and deliberately left for later:
  // getting it wrong (blocking a font, a redirect, a future embed) is a worse outcome on
  // launch day than not having one yet — see LAUNCH_CHECKLIST.md.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
