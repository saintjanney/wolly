import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone output traces the exact files this app needs and bundles a
  // minimal node_modules alongside a server.js. That means NO npm install
  // happens at deploy time, which is the whole point: the previous approach
  // (firebase-tools' webframeworks backend) synthesised a package.json that
  // could not stay in sync with a workspace lockfile, and it is untested past
  // Next 15.0 while we are pinned to 15.5.21 for CVE-2025-66478.
  output: 'standalone',

  // Tracing must start at the monorepo root or workspace dependencies,
  // including @wolly/schema, are missed.
  outputFileTracingRoot: path.join(__dirname, '../../'),

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
  //
  // `@wolly/schema` is a devDependency here, not a dependency, and that is
  // deliberate. Deploying this app builds a Cloud Function, and that packaging
  // step runs `npm install` against the public registry, where a workspace-only
  // package does not exist. Because transpilePackages inlines the schema into
  // the build output, it is genuinely only needed at compile time, so listing
  // it as a devDependency is both accurate and what makes the deploy work.
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
