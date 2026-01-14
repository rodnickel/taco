FROM node:20-alpine

WORKDIR /app

# Install netcat for health checks
RUN apk add --no-cache netcat-openbsd

# Copy only api package files
COPY apps/api/package.json ./
COPY apps/api/prisma ./prisma/

# Install dependencies with npm
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy API source code (file by file to avoid overwriting node_modules)
COPY apps/api/src ./src/
COPY apps/api/tsconfig.json ./
COPY apps/api/docker-entrypoint.sh ./
COPY apps/api/docker-entrypoint-worker.sh ./

# Build
RUN npm run build

# Make entrypoints executable
RUN chmod +x docker-entrypoint.sh docker-entrypoint-worker.sh

EXPOSE 3333

# Use entrypoint for migrations
ENTRYPOINT ["./docker-entrypoint.sh"]

# Default command (can be overridden for worker)
CMD ["node", "dist/server.js"]
