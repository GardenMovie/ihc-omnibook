import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: no Node server needed (see SPEC 9).
  output: "export",
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
