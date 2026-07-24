import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Deliberately NOT `output: 'export'`, unlike creator-hub and backoffice.
  //
  // This surface is read by logged-out humans and by search-engine crawlers,
  // and posts publish continuously, so pages must render on demand. It is also
  // where the paywall is enforced for the web: the paid segment of a post is
  // resolved server-side and never reaches a browser that has not paid for it,
  // which a static export cannot do.
  //
  // Consequence: this app deploys via Firebase Hosting's framework backend
  // (Cloud Run), not as static files. See firebase.json.

  // Consume the shared canonical schema package directly from source.
  transpilePackages: ['@wolly/schema'],

  // firebase-admin is server-only; keep it out of any client bundle.
  serverExternalPackages: ['firebase-admin'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
    ],
  },
};

export default nextConfig;
