import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: { "/*": ["./drizzle/**/*.sql", "./drizzle/meta/_journal.json"] },
};

export default nextConfig;
