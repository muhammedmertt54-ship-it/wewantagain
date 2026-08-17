import type {
  NextConfig,
} from "next";

const isProduction =
  process.env.NODE_ENV ===
  "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'" +
    (
      isProduction
        ? ""
        : " 'unsafe-eval'"
    ),
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src 'self'",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
]
  .join("; ")
  .replace(
    /\s{2,}/g,
    " "
  )
  .trim();

const securityHeaders = [
  {
    key:
      "Content-Security-Policy",
    value:
      contentSecurityPolicy,
  },
  {
    key:
      "Strict-Transport-Security",
    value:
      "max-age=63072000; includeSubDomains",
  },
  {
    key:
      "X-Content-Type-Options",
    value:
      "nosniff",
  },
  {
    key:
      "X-Frame-Options",
    value:
      "DENY",
  },
  {
    key:
      "Referrer-Policy",
    value:
      "strict-origin-when-cross-origin",
  },
  {
    key:
      "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()",
  },
  {
    key:
      "Cross-Origin-Opener-Policy",
    value:
      "same-origin",
  },
  {
    key:
      "X-DNS-Prefetch-Control",
    value:
      "off",
  },
  {
    key:
      "X-Permitted-Cross-Domain-Policies",
    value:
      "none",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader:
    false,

  async headers() {
    return [
      {
        source:
          "/:path*",

        headers:
          securityHeaders,
      },
    ];
  },
};

export default nextConfig;