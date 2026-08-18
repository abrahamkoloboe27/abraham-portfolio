import type { NextConfig } from "next";

const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").origin;
  } catch {
    return "http://localhost:8000";
  }
})();

const nextConfig: NextConfig = {
  // `standalone` produces a self-contained server bundle for the Docker image.
  // On Vercel the platform supplies its own adapter, so the option is dropped.
  output: process.env.VERCEL ? undefined : "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: new URL(apiOrigin).hostname },
    ],
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // The API owns the canonical feed and sitemap; expose them at the site root.
      { source: "/rss.xml", destination: "/fr/rss.xml", permanent: false },
    ];
  },
};

export default nextConfig;
