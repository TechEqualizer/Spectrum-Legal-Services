import type { NextConfig } from "next";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

const nextConfig: NextConfig = {
  // Keep the concept preview out of search engines, including the API routes.
  async headers() {
    return demoMode
      ? [
          {
            source: "/:path*",
            headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
          },
        ]
      : [];
  },
};

export default nextConfig;
