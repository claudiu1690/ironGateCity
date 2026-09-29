# syntax=docker/dockerfile:1
# API and worker image. Build from the repository root:
#   docker build -f apps/server/Dockerfile -t irongate-server .
# One image, two services: `node dist/index.js` (API, health check /healthz) and `node dist/worker.js`.

FROM node:22.12-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
# mongod for tests is not needed in an image build.
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY packages/rules/package.json packages/rules/
COPY packages/content/package.json packages/content/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile --filter @irongate/server...
COPY tsconfig.base.json ./
COPY packages/rules packages/rules
COPY packages/content packages/content
COPY packages/db packages/db
COPY apps/server apps/server
RUN pnpm --filter @irongate/server build
# A pruned copy of the server package with production dependencies only.
RUN pnpm --filter @irongate/server deploy --prod --legacy /out

FROM node:22.12-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/package.json ./package.json
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/server/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "dist/index.js"]
