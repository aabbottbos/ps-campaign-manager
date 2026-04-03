/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'productschool.com',
        pathname: '/_next/static/media/**',
      },
    ],
  },
}

module.exports = nextConfig
