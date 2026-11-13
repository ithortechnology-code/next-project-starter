FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY apps/api apps/api
COPY packages/shared packages/shared
RUN npm run build --workspace=@starter/api

FROM node:22-alpine AS runtime-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev --workspace=@starter/api --workspace=@starter/shared --include-workspace-root=false

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production API_PORT=4000 HOST=0.0.0.0
COPY --from=runtime-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /repo/apps/api/dist ./apps/api/dist
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
