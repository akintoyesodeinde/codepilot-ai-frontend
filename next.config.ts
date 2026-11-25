import type { NextConfig } from 'next';

const backendApiUrl = (process.env.BACKEND_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  rewrites: async () => [
    {
      source: '/api/v1/:path*',
      destination: `${backendApiUrl}/api/v1/:path*`,
    },
  ],
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        {
          key: 'Content-Security-Policy',
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: blob:; font-src 'self' data: https://cdn.jsdelivr.net; worker-src 'self' blob:; connect-src 'self'; frame-ancestors 'none';",
        },
      ],
    },
  ],
};

export default nextConfig;
