import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Explicitly pin the workspace root so Next.js doesn't infer a parent
  // directory as the root when other lockfiles exist nearby.
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    // Increase limit for the body of route handlers (variant generation can
    // POST a list of large protein sequences).
    serverActions: { bodySizeLimit: "5mb" },
  },
  images: {
    remotePatterns: [
      // RCSB PDB structure images, used in candidate detail viewer.
      { protocol: "https", hostname: "cdn.rcsb.org" },
      // UniProt avatars / organism images (used cautiously; most data is text).
      { protocol: "https", hostname: "rest.uniprot.org" },
    ],
  },
};

export default nextConfig;
