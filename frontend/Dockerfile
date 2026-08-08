# Build multi-stage del frontend Angular: compila y sirve estático con nginx.
# Contexto de build: ./frontend (ver docker-compose.yml).

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (no ci): el lockfile trae dependencias opcionales resueltas en
# macOS (chokidar/fsevents) que no calzan con `npm ci` en Linux/Alpine.
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/dist/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
