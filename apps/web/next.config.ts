import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.NEXT_TEST_DIST_DIR ?? ".next",
  transpilePackages: ["@starter/shared"],
};
export default nextConfig;
