import { ImageResponse } from "next/og";


// Generated placeholder icon (brand-yellow square with "B" mark) until the client
// sends a real logo — swap this route for a static asset at that point.
export async function GET() {
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
          borderRadius: 80,
        }}
      >
        <div
          style={{
            fontSize: 260,
            fontWeight: 700,
            color: "#171717",
            fontFamily: "sans-serif",
          }}
        >
          B
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
