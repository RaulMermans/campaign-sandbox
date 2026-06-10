import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse loads PDF.js internals that must run as a real Node module,
  // not be bundled — keep it external to the server bundle.
  serverExternalPackages: ["pdf-parse"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
