import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@penumbra-zone/ui',
    '@penumbra-zone/client',
    '@penumbra-zone/protobuf',
    '@penumbra-zone/types',
    '@penumbra-zone/getters',
    '@penumbra-zone/bech32m',
  ],
  webpack: config => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
