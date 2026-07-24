# Runtime image for the SSR blog.
#
# This image installs NOTHING. `next build` with `output: 'standalone'` has
# already traced the exact files the server needs and written a minimal
# node_modules next to a generated server.js, so the whole job here is to copy
# that tree and run it.
#
# That property is the reason this exists. The previous approach, firebase-tools'
# `webframeworks` backend, synthesised its own package.json for a Cloud Function
# and ran `npm ci` against the monorepo lockfile at deploy time. Those two can
# never reliably agree in an npm workspaces repo, and the integration is untested
# past Next 15.0 while we are pinned to 15.5.21 for CVE-2025-66478. Removing the
# deploy-time install removes that entire class of failure.
#
# Build context is apps/blog, AFTER `next build` has run. See .dockerignore.

FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# The standalone tree is rooted at the monorepo (outputFileTracingRoot), so it
# arrives as apps/blog/... plus a shared node_modules and packages/.
COPY .next/standalone ./

# Static assets are deliberately not part of the standalone trace and have to be
# copied in alongside it, or every page renders unstyled with no client JS.
COPY .next/static ./apps/blog/.next/static

# Cloud Run sends traffic to $PORT and requires listening on all interfaces.
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
EXPOSE 8080

# Run as an unprivileged user. node:20-slim ships a `node` user for this.
USER node

CMD ["node", "apps/blog/server.js"]
