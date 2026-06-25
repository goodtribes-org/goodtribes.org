import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
    const bucket = process.env.S3_PUBLIC_BUCKET ?? "goodtribes-public";
    return [
      {
        source: "/storage/:path*",
        destination: `${endpoint}/${bucket}/:path*`,
      },
    ];
  },
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

export default nextConfig;
