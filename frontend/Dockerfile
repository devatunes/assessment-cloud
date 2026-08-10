# Build multi-stage del frontend Angular: compila y sirve estático con nginx.
# Contexto de build: ./frontend (ver docker-compose.yml).

FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (no ci): el lockfile trae dependencias opcionales resueltas en
# macOS (chokidar/fsevents) que no calzan con `npm ci` en Linux/Alpine.
RUN npm install
COPY . .
# development, no production (default de angular.json): production usa
# environment.prod.ts, que trae hardcodeada la URL real de AWS para el
# flujo de deploy-frontend.sh — acá necesitamos environment.ts, que apunta
# a http://localhost:3000 (el backend de este mismo docker-compose).
RUN npm run build -- --configuration=development

FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/dist/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
