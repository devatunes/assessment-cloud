# Costos: actual vs. objetivo

Estimados con precios públicos de AWS (`us-east-1`, agosto 2026). Son
aproximaciones — el costo real depende del tráfico, la duración de las
invocaciones y las políticas de auto scaling configuradas — pero alcanzan
para decidir con números, no solo con intuición.

## Actual — desplegado hoy

| Recurso | Configuración | Free tier (primeros 12 meses) | Sin free tier |
|---|---|---:|---:|
| RDS | `db.t3.micro` · 20GB gp3 | $0 | ~$14/mes |
| Lambda backend | 1024MB, uso puntual | $0 (permanente) | <$1/mes |
| Lambda executor | 256MB, uso puntual | $0 (permanente) | <$1/mes |
| API Gateway | HTTP API v2 | $0 | <$1/mes |
| S3 + CloudFront | Price Class 100 | $0 (permanente) | ~$1/mes |
| CloudWatch Logs | retención 7 días | $0 | <$1/mes |
| **Total** | | **~$0/mes** | **~$14–17/mes** |

Sin NAT Gateway ni VPC Interface Endpoints — esa decisión sola evita
~$32–40/mes fijos. Ver el razonamiento completo en
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## Objetivo — para alto tráfico sostenido

Cada pieza nueva de [`ARCHITECTURE.md`](ARCHITECTURE.md), con lo que agrega
al costo mensual (capacidad mínima, sin picos de auto scaling):

| Recurso | Configuración mínima | Costo estimado |
|---|---|---:|
| Application Load Balancer | 1, siempre encendido | ~$20/mes |
| ECS Fargate — backend | 2 tasks · 0.5 vCPU / 1GB c/u | ~$36/mes |
| ECS Fargate — executor | 2 tasks · 0.25 vCPU / 0.5GB c/u (pool cálido) | ~$18/mes |
| RDS Proxy | sobre la instancia existente (2 vCPU) | ~$22/mes |
| RDS Read Replica | misma clase que la primaria | ~$14/mes |
| VPC Interface Endpoints | ECR (api+dkr), CloudWatch Logs, Secrets Manager × 2 AZ | ~$58/mes |
| VPC Endpoint a S3 (Gateway) | | $0 (siempre gratis) |
| **Total nuevo** | | **~$168/mes** |

Esto es **adicional** a lo que ya cuesta CloudFront + S3 (~$1/mes, sin
cambios — sigue siendo la pieza óptima). El salto real es de ~$15/mes a
~$185/mes.

### Por qué el salto es tan grande

No es un solo culpable — son varias piezas que individualmente parecen
baratas pero se suman:

- Los **VPC Interface Endpoints son el rubro más caro** (~$58/mes) y
  sorprende, porque parecen "gratis" al no ser cómputo. Cada uno cobra por
  hora *y por AZ* — 4 servicios × 2 AZs = 8 endpoints-hora. Si el tráfico no
  justifica la resiliencia multi-AZ todavía, se puede empezar con una sola
  AZ y bajar esto a la mitad (~$29/mes), sacrificando disponibilidad si esa
  AZ falla.
- El **ALB cobra una tarifa fija por hora** exista o no tráfico — a
  diferencia de API Gateway HTTP v2, que cobra por request.
- **ECS Fargate no escala a cero**: el mínimo de tasks (2+2, para no
  quedarse sin capacidad ante el primer pico) corre 24/7 aunque nadie esté
  usando la plataforma a las 3am.

### Por qué igual conviene, si el tráfico lo justifica

Todo este costo nuevo compra tres cosas que la arquitectura actual no
puede dar en ningún punto, sin importar cuánto se optimice:

1. **Cero cold starts** — la Lambda del backend tiene que "despertar" en
   cada rato de inactividad; un servicio ECS corriendo no.
2. **Aislamiento real del executor** — contenedor efímero por ejecución,
   no un proceso hijo dentro del mismo entorno (`spawnSync`). Ver el
   detalle en [`ARCHITECTURE.md`](ARCHITECTURE.md).
3. **RDS deja de ser pública** — hoy el puerto 5432 está abierto a
   `0.0.0.0/0` (compensado con TLS forzado); con VPC privada + RDS Proxy,
   deja de ser network-accesible desde fuera en absoluto.

### Camino intermedio, si el costo pesa pero el tráfico ya creció un poco

No hace falta saltar de una vez a los ~$168/mes completos. Se puede adoptar
por partes, en el orden que más impacto da por dólar:

1. **RDS Proxy solo** (~$22/mes) — resuelve el agotamiento de conexiones
   sin tocar cómputo ni red.
2. **Read Replica** (~$14/mes) — separa reportes/historial de las
   escrituras en vivo.
3. **Backend a ECS** (~$56/mes con ALB) — recién acá se necesita la VPC y
   los Endpoints, así que es el salto más grande y el que más conviene
   posponer hasta que el tráfico realmente lo pida.
