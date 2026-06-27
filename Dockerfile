# ─── Stage 1: base — shared deps install ────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force

# ─── Stage 2: development — hot reload via volume mount ──────────────────────
FROM base AS development
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && npm run start:dev"]

# ─── Stage 3: builder — compile TypeScript ───────────────────────────────────
FROM base AS builder
COPY . .
RUN npx prisma generate && npm run build

# ─── Stage 4: production — minimal runtime image ─────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
