import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GoodTribes.org",
    short_name: "GoodTribes",
    description: "Connecting skilled volunteers with impact-driven organisations to build a better world together.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#254441",
    // ?v=2 busts the year-long immutable cache public/ files get in
    // production (see next's router-server.js) now that the mark changed —
    // bump this again on any future icon update.
    icons: [
      { src: "/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
