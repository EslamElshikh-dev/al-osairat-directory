import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const legacyVercelHosts = [
  'al-osairat-directory.vercel.app',
  'al-osairat-directory-moqawel1215-3361s-projects.vercel.app',
  'al-osairat-directory-git-main-moqawel1215-3361s-projects.vercel.app',
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_SITE_URL: 'https://usayrat.online',
  },
  async redirects() {
    return [
      ...legacyVercelHosts.map((host) => ({
        source: '/:path*',
        has: [{ type: 'host' as const, value: host }],
        destination: 'https://usayrat.online/:path*',
        permanent: true,
      })),
      {
        source: '/map',
        destination: '/villages',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
