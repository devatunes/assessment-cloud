# --- ALB: recibe tráfico público en 80/443 ---
resource "aws_security_group" "alb" {
  name        = "${var.name_prefix}-alb-sg"
  description = "Trafico publico hacia el ALB"
  vpc_id      = aws_vpc.this.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-alb-sg" })
}

# --- ECS backend: solo recibe del ALB ---
resource "aws_security_group" "ecs_backend" {
  name        = "${var.name_prefix}-ecs-backend-sg"
  description = "Backend NestJS en ECS Fargate, solo accesible desde el ALB"
  vpc_id      = aws_vpc.this.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-ecs-backend-sg" })
}

# --- ECS executor: NO recibe nada de fuera, solo el backend lo invoca por red interna ---
resource "aws_security_group" "ecs_executor" {
  name        = "${var.name_prefix}-ecs-executor-sg"
  description = "Pool de executor, aislado, solo alcanzable desde el backend"
  vpc_id      = aws_vpc.this.id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_backend.id]
  }

  # Sin egress abierto: el executor no necesita salir a ningún lado — ni
  # siquiera a los VPC Endpoints, salvo CloudWatch Logs para reportar resultado.
  egress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.vpc_endpoints.id]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-ecs-executor-sg" })
}

# --- VPC Endpoints (Interface): reciben HTTPS desde lo que corre en subnets privadas ---
resource "aws_security_group" "vpc_endpoints" {
  name        = "${var.name_prefix}-vpce-sg"
  description = "Trafico HTTPS interno hacia los VPC Endpoints"
  vpc_id      = aws_vpc.this.id

  # CIDR de la VPC en vez de referenciar los SG de ecs_backend/ecs_executor:
  # ecs_executor ya referencia este SG en su egress, así que ir SG-a-SG acá
  # crearía un ciclo de dependencia entre los tres security groups.
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-vpce-sg" })
}

# --- RDS Proxy: solo el backend puede llegar a la base a través de él ---
resource "aws_security_group" "rds_proxy" {
  name        = "${var.name_prefix}-rds-proxy-sg"
  description = "RDS Proxy, solo alcanzable desde el backend en ECS"
  vpc_id      = aws_vpc.this.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_backend.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-rds-proxy-sg" })
}
