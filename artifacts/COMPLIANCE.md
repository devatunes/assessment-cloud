# Cumplimiento del reto

Cada punto del enunciado, verificado contra el código real — no una
afirmación, un mapa exacto de dónde vivir cada requisito.

## Funcionalidades

| Requisito | Cumple | Evidencia |
|---|---|---|
| Biblioteca de preguntas — categoría, dificultad, tipo (MC/Código) | ✅ | `backend/src/questions/entities/question.entity.ts` — `QuestionCategory`, `QuestionDifficulty`, `QuestionType` |
| Crear Assessment — seleccionar preguntas de la biblioteca | ✅ | `backend/src/assessments/dto/create-assessment.dto.ts` (`questionIds`), `frontend/src/app/pages/assessment-create/` |
| Resolver Assessment — MC y ejercicio de código, mismo flujo | ✅ | `frontend/src/app/pages/attempt-take/attempt-take.component.html` |
| Ejecutar Código — editor, Output esperado/obtenido, Pass/Fail | ✅ | `attempt-take.component.html` (por cada test case) + `executor/runner.js` (motor propio, sin API externa) |
| Arquitectura — diagrama Angular → API → Node → DB → Motor de ejecución | ✅ | [`ARCHITECTURE.md`](ARCHITECTURE.md) — misma cadena, con nombres reales de AWS |

**Sobre el editor de código:** solo soporta JavaScript, no Java — el
enunciado permite cualquiera de los dos. **Sobre el motor de ejecución:** es
propio (`spawnSync` sandboxed), no Judge0/Piston — el enunciado permite esa
alternativa siempre que se explique la evolución, cubierto en
[`ARCHITECTURE.md`](ARCHITECTURE.md) (sección "Objetivo") y en el README
(["Qué haría con más tiempo"](../README.md#qué-haría-con-más-tiempo)).

## Stack sugerido

| Opción del enunciado | Elegido | Por qué |
|---|---|---|
| Backend: Java+Spring **o** Node+JS | Node + NestJS | Ver [README § Decisiones y trade-offs](../README.md#decisiones-y-trade-offs) |
| Frontend: Angular | Angular | Único requerido, sin alternativa |
| Base de datos: libre elección | PostgreSQL | Ver mismo apartado |

## Bonus ⭐

| Bonus | Cumple | Evidencia |
|---|---|---|
| Docker | ✅ | `docker-compose.yml`, [`LOCAL_SETUP.md`](LOCAL_SETUP.md) |
| Swagger/OpenAPI | ✅ | [`/docs` en vivo](https://g9yvdux2rl.execute-api.us-east-1.amazonaws.com/docs) |
| Despliegue en AWS | ✅ | Lambda + API Gateway + RDS + S3/CloudFront reales, no un free tier genérico |

## Consideraciones de seguridad

| Requisito | Cumple | Evidencia |
|---|---|---|
| No subir credenciales reales ni secretos a repos públicos | ✅ | Auditado manualmente: sin AWS keys, sin passwords reales, sin private keys en ningún archivo del repo. |
| Usar datos simulados en todos los ejemplos | ✅ | Seed y `.env.example` usan `admin@example.com` / `changeme123` — nunca datos reales. |
| Versionar el código en repositorios personales | ✅ | `github.com/devatunes/assessment-cloud` y `app-iac` — cuentas personales, no del banco. |
| Usar `.gitignore` para excluir archivos sensibles | ✅ | `.env`, `*.local.env` y credenciales de deploy ignorados desde el primer commit — `backend/.env` real nunca se commiteó. |

## Entregables

| Entregable | Dónde |
|---|---|
| Código fuente | Este repositorio |
| README | [`../README.md`](../README.md) |
| Diagrama de arquitectura | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Instrucciones de ejecución | [`LOCAL_SETUP.md`](LOCAL_SETUP.md) + plataforma ya [desplegada en vivo](https://dkdbmj2vpxalx.cloudfront.net) |
