import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  logging: {
    incomingRequests: false,
    fetches: { fullUrl: false },
    browserToTerminal: false,
    serverFunctions: false,
  },
  distDir: process.env.NEXT_TEST_DIST_DIR ?? ".next",
  transpilePackages: ["@starter/shared"],
};
export default nextConfig;
