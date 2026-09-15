import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
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
          borderRadius: 6,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: "#171717", fontFamily: "sans-serif" }}>
          B
        </div>
      </div>
    ),
    size,
  );
}
