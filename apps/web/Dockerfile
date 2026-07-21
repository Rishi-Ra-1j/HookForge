FROM node:22-alpine

WORKDIR /app

# Copy root package.json for workspaces
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm install

# Copy source code
COPY apps/web ./apps/web
COPY tsconfig.base.json ./

# Build Next.js
RUN cd apps/web && npm run build

# Start Next.js
WORKDIR /app/apps/web
CMD ["npx", "next", "start"]