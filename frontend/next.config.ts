import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  additionalPrecacheEntries: [{ url: "/offline", revision: "1" }],
});

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "*.goodtribes.org",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "goodtribes.org",
      },
    ],
  },
};

// withSerwist() unconditionally attaches a `webpack()` config function, which Next.js 16
// rejects under Turbopack (the default for `next dev`). Only apply it for production builds,
// which run via `next build --webpack` (see package.json) specifically so Serwist can work —
// Serwist's webpack-based integration doesn't yet support Turbopack.
export default withNextIntl(process.env.NODE_ENV === "production" ? withSerwist(nextConfig) : nextConfig);
