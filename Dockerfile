FROM node:20-alpine AS base
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm

COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist

CMD ["node", "dist/index.js"]
