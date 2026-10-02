import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/config/site";

// The preview card people see when the funnel link is pasted into a text,
// DM or post. Generated once at build time.

export const alt = `Injury Insights from Attorney Jeff, ${site.name}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logo = `data:image/png;base64,${(
  await readFile(join(process.cwd(), "public/brand/jlf-logo-white.png"))
).toString("base64")}`;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0E1A2B 0%, #1E3A5F 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <img src={logo} width={264} height={120} alt="" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#6CB4D8", letterSpacing: 2 }}>
            HURT IN AN ACCIDENT?
          </div>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, marginTop: 12 }}>
            Short videos from Attorney Jeff on what to do next.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#d1d5db" }}>
          <span>Watch, then call or book a free case review</span>
          <span>{site.demoMode ? "Concept preview" : site.phone.display}</span>
        </div>
      </div>
    ),
    size
  );
}
