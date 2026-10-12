"use client";

import { useEffect } from "react";

/** Exposes window.__makeDepth(src, model?) → a PNG data URL, or null. */
export default function DepthCheck() {
  useEffect(() => {
    (window as unknown as { __makeDepth?: unknown }).__makeDepth = async (src: string, model?: string) => {
      const { makeDepthMap } = await import("@/lib/depth-map");
      const png = await makeDepthMap(src, model);
      if (!png) return null;
      return await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(png);
      });
    };
  }, []);
  return <main className="p-6 text-white">Depth check</main>;
}
