import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin images from Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Security headers — applied in addition to Vercel edge headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Supabase — auth, storage, realtime
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              // Fonts self-hosted; no external font CDN
              "font-src 'self'",
              // Tremor/Recharts inline SVG
              "img-src 'self' data: blob: https://*.supabase.co",
              // Next.js fast-refresh in dev requires unsafe-inline on style;
              // in prod, nonces or hashes should replace this.
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-inline'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
