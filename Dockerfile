FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 1. Install dependencies based on the preferred package manager
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN pnpm install --frozen-lockfile

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

ARG NEXT_PUBLIC_APP_URL=https://budget.twogether.click
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm build

# 3. Production image, copy all the files and run next
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
