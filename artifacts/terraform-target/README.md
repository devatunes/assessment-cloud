# Terraform de referencia — arquitectura objetivo

Código de ejemplo para cuando el tráfico justifique migrar a la arquitectura
descrita en [`../ARCHITECTURE.md`](../ARCHITECTURE.md). **No es parte del
despliegue actual y no se aplicó contra ninguna cuenta de AWS** — la
infraestructura real de este proyecto vive en el repo de IaC del equipo,
como todo lo demás. Esto es solo el punto de partida para implementarla
cuando corresponda.

Es un módulo autocontenido (crea su propia VPC) para que se pueda leer,
adaptar o probar de forma aislada, sin depender del state ni de los
módulos ya existentes del repo de infraestructura real.

## Qué incluye

| Archivo | Qué crea |
|---|---|
| `network.tf` | VPC propia, subnets públicas (ALB) y privadas (ECS/RDS), NAT alternativo vía VPC Endpoints (ECR, CloudWatch Logs, S3), sin NAT Gateway. |
| `security.tf` | Security Groups: ALB → ECS backend, ECS → RDS Proxy, aislamiento del pool del executor. |
| `alb.tf` | Application Load Balancer + target group + listener HTTP. |
| `ecs.tf` | Cluster ECS, task definitions y services Fargate para backend (auto scaling) y executor (pool cálido). |
| `rds_proxy.tf` | RDS Proxy delante de la instancia existente (se referencia por `var.db_instance_identifier`, no la crea). |
| `rds_replica.tf` | Read Replica de la instancia existente. |
| `variables.tf` / `outputs.tf` / `versions.tf` | Entradas, salidas y versión de provider requerida. |

## Qué NO incluye a propósito

- No crea la instancia RDS primaria (`aws_db_instance`) — se asume que ya
  existe (es la misma que corre hoy) y solo se referencia por variable.
- No incluye pipeline de CI/CD para publicar imágenes a ECR — asume que la
  imagen del backend (mismo `backend/Dockerfile` del repo) ya está publicada.
- No incluye dominio custom / ACM — usa el DNS del ALB directamente, igual
  que la arquitectura actual usa el dominio default de CloudFront.

## Cómo usarlo cuando llegue el momento

```bash
cd artifacts/terraform-target
terraform init
terraform plan -var="db_instance_identifier=assessment-backend-postgres" -var="ecr_image_uri=<...>"
```

Antes de aplicar de verdad: revisar `variables.tf` completo, apuntar
`ecr_image_uri` a una imagen real ya publicada, y confirmar el
`db_instance_identifier` de la instancia RDS existente que se quiere poner
detrás del Proxy.
