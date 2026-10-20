import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const config: NextConfig = {
  poweredByHeader: false,
  // Only used for local test builds; Render uses the normal build.
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
  outputFileTracingIncludes: { "/*": ["./db/**/*"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
