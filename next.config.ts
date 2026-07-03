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
              // Supabase — auth, storage, realtime. Razorpay — checkout telemetry/API.
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://lumberjack.razorpay.com",
              // Fonts self-hosted; no external font CDN
              "font-src 'self'",
              // Tremor/Recharts inline SVG; Razorpay checkout assets
              "img-src 'self' data: blob: https://*.supabase.co https://*.razorpay.com",
              // Next.js fast-refresh in dev requires unsafe-inline on style;
              // in prod, nonces or hashes should replace this.
              "style-src 'self' 'unsafe-inline'",
              // Dev-only 'unsafe-eval': webpack dev runtime eval()s modules;
              // without it nothing hydrates locally. Never emitted in prod.
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://cdn.razorpay.com`,
              // Razorpay checkout renders inside an iframe
              "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
