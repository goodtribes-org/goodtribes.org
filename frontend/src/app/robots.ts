import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/profile/setup",
          "/welcome",
          "/settings",
          "/dashboard",
          "/workplace",
          "/my-goodtribes",
          "/notifications",
          "/invite/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
