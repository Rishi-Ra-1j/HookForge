FROM node:22-alpine

WORKDIR /app

# Copy root package.json for workspaces
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
COPY packages/queue/package.json ./packages/queue/

# Install all dependencies
RUN npm install

# Copy source code
COPY apps/worker ./apps/worker
COPY packages/db ./packages/db
COPY packages/queue ./packages/queue
COPY tsconfig.base.json ./

# Generate Prisma client
RUN cd packages/db && npx prisma generate

# Start the worker
CMD ["npx", "tsx", "apps/worker/src/index.ts"]