# RDS Proxy delante de la instancia PostgreSQL YA EXISTENTE (no se crea
# acá) — multiplexa las conexiones que abren los tasks de ECS para no
# agotar max_connections de Postgres bajo carga.

data "aws_db_instance" "existing" {
  db_instance_identifier = var.db_instance_identifier
}

data "aws_iam_policy_document" "rds_proxy_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["rds.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "rds_proxy" {
  name               = "${var.name_prefix}-rds-proxy-role"
  assume_role_policy = data.aws_iam_policy_document.rds_proxy_assume_role.json
  tags               = var.tags
}

resource "aws_iam_role_policy" "rds_proxy_read_secret" {
  name   = "${var.name_prefix}-rds-proxy-read-secret"
  role   = aws_iam_role.rds_proxy.id
  policy = data.aws_iam_policy_document.read_db_secret.json
}

resource "aws_db_proxy" "this" {
  name                   = "${var.name_prefix}-db-proxy"
  engine_family          = "POSTGRESQL"
  role_arn               = aws_iam_role.rds_proxy.arn
  vpc_subnet_ids         = aws_subnet.private[*].id
  vpc_security_group_ids = [aws_security_group.rds_proxy.id]
  require_tls            = true

  auth {
    auth_scheme = "SECRETS"
    secret_arn  = var.db_secret_arn
    iam_auth    = "DISABLED"
  }

  tags = var.tags
}

resource "aws_db_proxy_default_target_group" "this" {
  db_proxy_name = aws_db_proxy.this.name

  connection_pool_config {
    max_connections_percent      = 100
    max_idle_connections_percent = 50
  }
}

resource "aws_db_proxy_target" "primary" {
  db_proxy_name          = aws_db_proxy.this.name
  target_group_name      = aws_db_proxy_default_target_group.this.name
  db_instance_identifier = data.aws_db_instance.existing.db_instance_identifier
}
