import type { NextConfig } from "next";

// Domæner der må vise assistenten i en iframe (shoppen + lokale test).
const FRAME_ANCESTORS =
  process.env.FRAME_ANCESTORS || "'self' https://vvsfittings.dk https://*.vvsfittings.dk";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/widget.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=86400" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/embed",
        headers: [{ key: "Content-Security-Policy", value: `frame-ancestors ${FRAME_ANCESTORS}` }],
      },
    ];
  },
};

export default nextConfig;
