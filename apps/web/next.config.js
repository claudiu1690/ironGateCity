/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  reactStrictMode: true,

  // Full source maps in dev so browser devtools show real .tsx files and line numbers.
  // Disabled in production to avoid leaking source code.
  productionBrowserSourceMaps: false,
  ...(isDev && { webpack: (config) => { config.devtool = 'source-map'; return config; } }),

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
