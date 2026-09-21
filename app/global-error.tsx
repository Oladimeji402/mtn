"use client";

import { GENERIC_ERROR_MESSAGE } from "@/lib/errors";

// Replaces the root layout when it itself fails, so globals.css and the theme aren't
// loaded — hence the inline styles.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fff", color: "#111" }}>
        <div style={{ maxWidth: 360, margin: "0 auto", padding: "96px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#666" }}>{GENERIC_ERROR_MESSAGE}</p>
          {error.digest ? <p style={{ fontSize: 12, color: "#888" }}>Reference: {error.digest}</p> : null}
          <button
            onClick={reset}
            style={{ marginTop: 16, padding: "10px 20px", borderRadius: 8, border: 0, background: "#111", color: "#fff", fontSize: 14 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
