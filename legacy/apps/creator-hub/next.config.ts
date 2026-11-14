import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Consume the shared canonical schema package directly from source.
  transpilePackages: ['@wolly/schema']
};

export default nextConfig;
