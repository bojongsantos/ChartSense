import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ChartSense keeps a concise discovery stub and the full rules under docs/.
  agentRules: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
