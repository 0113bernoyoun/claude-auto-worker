/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5849/api',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
