# Cómo correr el proyecto en local

Guía rápida, sin vueltas. Dos caminos: **Docker** (recomendado, cero
configuración) o **hot-reload** (para modificar código).

## Requisito único

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado
  y corriendo.

Nada más. Node, Postgres y todas las dependencias quedan dentro de los
contenedores.

## Opción A — Todo con un solo comando (recomendado)

```bash
git clone <url-del-repo>
cd assessment-cloud
docker compose up --build
```

Espera a ver el log `Nest application successfully started` — eso tarda
1-2 minutos la primera vez (build de las imágenes). Migraciones y datos de
ejemplo se cargan solos, no hay que hacer nada más.

Ya está corriendo en:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:4200 |
| API (Swagger) | http://localhost:3000/docs |

Para apagar todo: `Ctrl+C` y luego `docker compose down` (agrega `-v` si
también quieres borrar la base de datos y empezar de cero).

## Opción B — Hot-reload (si vas a tocar código)

Solo la base de datos va en Docker; backend y frontend corren directo en tu
máquina para que los cambios se reflejen al instante. Requiere Node 24+.

```bash
# 1. Base de datos
docker compose up -d db

# 2. Backend — en una terminal
cd backend
cp .env.example .env
npm install
npm run start:dev

# 3. Frontend — en otra terminal
cd frontend
npm install
npm start
```

Mismas URLs que la Opción A (frontend `:4200`, API `:3000/docs`).

## Primer ingreso

No hay usuario admin visible por defecto. Dos formas de entrar:

- **Como organización (reclutador/admin):** ve a `/register` y crea tu
  propia organización — nombre, tu nombre y correo, contraseña (mínimo 8
  caracteres). Quedas logueado de una.
- **Como candidato** (para probar simulacros): en esa misma página `/register`
  hay un selector para cambiar a "Candidato" antes de llenar el formulario.

Si quieres ver los datos de ejemplo que trae el seed (bajo una
"Organización por defecto"), define `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` en `backend/.env` **antes** del primer arranque y
entra con esas credenciales.

## Correr los tests

```bash
npm run test:executor        # runner del executor de código
npm run test:backend         # unit tests del backend
npm run test:backend:e2e     # e2e — requiere `docker compose up -d db` corriendo
npm run test:frontend        # unit tests del frontend
npm test                     # los cuatro juntos
```

## Problemas comunes

| Síntoma | Causa / solución |
|---|---|
| `port is already allocated` | Algo ya usa el puerto 4200, 3000 o 5433. Ciérralo o cambia el puerto en `docker-compose.yml`. |
| El frontend carga pero no trae datos | El backend aún no terminó de levantar (espera el log `Nest application successfully started`) o no corriste `docker compose up -d db` en la Opción B. |
| `npm run test:backend:e2e` falla de entrada | Necesita Postgres corriendo — confirma `docker compose up -d db`. |
