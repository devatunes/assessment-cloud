# Build multi-stage del backend NestJS.
# El contexto de build es la RAÍZ del monorepo (ver docker-compose.yml:
# `context: .`, `dockerfile: backend/Dockerfile`) porque en runtime el
# backend necesita el código de ../executor (modo EXECUTOR_MODE=local,
# ver src/executor/executor.service.ts) con la misma estructura relativa
# de carpetas que existe fuera de Docker.

FROM node:24-alpine AS builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/backend/dist ./dist
# Copiado como hermano de /app/backend, igual que en el monorepo real,
# para que el require relativo '../../../executor/runner' siga resolviendo.
COPY executor/index.js executor/runner.js /app/executor/

EXPOSE 3000
CMD ["node", "dist/main.js"]
