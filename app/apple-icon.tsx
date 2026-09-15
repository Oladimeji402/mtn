import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Generated placeholder (brand-yellow square, "B" mark) until the client sends a
// real logo. iOS applies its own corner rounding, so no radius here.
export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffcb05",
        }}
      >
        <div style={{ fontSize: 92, fontWeight: 700, color: "#171717", fontFamily: "sans-serif" }}>
          B
        </div>
      </div>
    ),
    size,
  );
}
