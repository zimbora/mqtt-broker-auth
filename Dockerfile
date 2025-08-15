# syntax=docker/dockerfile:1

# --- Base stage ---
FROM node:22.17.1-alpine AS base
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./

# --- Dev stage ---
FROM base AS dev
RUN npm ci
COPY . .
# Optional: Add dev-specific tools or configurations here
CMD ["sh", "-c", "node index.js"]  # or your dev command

# --- Staging stage ---
FROM base AS stage
RUN npm ci --only=production
COPY . .
CMD ["node", "index.js"]

# --- Production stage ---
FROM base AS prod
RUN npm ci --only=production
COPY . .
CMD ["node", "index.js"]
