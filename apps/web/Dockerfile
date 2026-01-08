FROM node:20-alpine AS builder

WORKDIR /app

# Copy only web package files
COPY apps/web/package.json ./

# Install dependencies with npm
RUN npm install

# Copy web source code
COPY apps/web/src ./src
COPY apps/web/public ./public
COPY apps/web/next.config.ts ./
COPY apps/web/tsconfig.json ./
COPY apps/web/tailwind.config.ts ./
COPY apps/web/postcss.config.mjs ./

# Build argument for API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
