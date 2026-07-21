FROM node:22-alpine

WORKDIR /app

# Copy root package.json for workspaces
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/queue/package.json ./packages/queue/

# Install all dependencies
RUN npm install

# Copy source code
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/queue ./packages/queue
COPY tsconfig.base.json ./

# Generate Prisma client
RUN cd packages/db && npx prisma generate

# Start the API
CMD ["npx", "tsx", "apps/api/src/index.ts"]