resource "aws_ecs_cluster" "this" {
  name = "${var.name_prefix}-cluster"
  tags = var.tags
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.name_prefix}-backend"
  retention_in_days = 30
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "executor" {
  name              = "/ecs/${var.name_prefix}-executor"
  retention_in_days = 30
  tags              = var.tags
}

# --- IAM: rol de ejecución (bajar la imagen de ECR, escribir logs, leer el
# secreto de la base) — es el rol que usa el agente de ECS, no la app. ---
data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_task_execution" {
  name               = "${var.name_prefix}-ecs-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "read_db_secret" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.db_secret_arn]
  }
}

resource "aws_iam_role_policy" "read_db_secret" {
  name   = "${var.name_prefix}-read-db-secret"
  role   = aws_iam_role.ecs_task_execution.id
  policy = data.aws_iam_policy_document.read_db_secret.json
}

# --- Rol de la app en sí (task role) — sin permisos extra, igual que las
# Lambdas hoy: si el código escapara del sandbox, no hay nada que tocar. ---
resource "aws_iam_role" "ecs_task" {
  name               = "${var.name_prefix}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
  tags               = var.tags
}

# --- Backend: N tasks, detrás del ALB, con auto scaling ---
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.name_prefix}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.ecr_image_uri
      essential = true
      portMappings = [
        { containerPort = 3000, protocol = "tcp" }
      ]
      environment = [
        { name = "PORT", value = "3000" },
        { name = "NODE_ENV", value = "production" },
        { name = "DB_HOST", value = "${aws_db_proxy.this.endpoint}" },
        { name = "DB_PORT", value = "5432" },
        { name = "DB_NAME", value = var.db_name },
        { name = "EXECUTOR_MODE", value = "http" },
        { name = "EXECUTOR_URL", value = "http://executor.${var.name_prefix}.local:8080" },
      ]
      secrets = [
        { name = "DB_USER", valueFrom = "${var.db_secret_arn}:username::" },
        { name = "DB_PASSWORD", valueFrom = "${var.db_secret_arn}:password::" },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])

  tags = var.tags
}

resource "aws_ecs_service" "backend" {
  name            = "${var.name_prefix}-backend"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs_backend.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]
  tags       = var.tags
}

# --- Executor: pool cálido, sin balanceador público, invocado por red
# interna desde el backend (Cloud Map / service discovery). ---
resource "aws_service_discovery_private_dns_namespace" "this" {
  name = "${var.name_prefix}.local"
  vpc  = aws_vpc.this.id
}

resource "aws_service_discovery_service" "executor" {
  name = "executor"
  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.this.id
    dns_records {
      ttl  = 10
      type = "A"
    }
  }
}

resource "aws_ecs_task_definition" "executor" {
  family                   = "${var.name_prefix}-executor"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.executor_cpu
  memory                   = var.executor_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "executor"
      image     = var.executor_image_uri
      essential = true
      portMappings = [
        { containerPort = 8080, protocol = "tcp" }
      ]
      # Sin variables de entorno con secretos: el executor no habla con la
      # base de datos ni con nada más — solo recibe código y devuelve
      # resultados, igual que la Lambda executor hoy.
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.executor.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "executor"
        }
      }
    }
  ])

  tags = var.tags
}

resource "aws_ecs_service" "executor" {
  name            = "${var.name_prefix}-executor"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.executor.arn
  desired_count   = var.executor_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs_executor.id]
  }

  service_registries {
    registry_arn = aws_service_discovery_service.executor.arn
  }

  tags = var.tags
}

# --- Auto scaling: ambos servicios escalan por CPU, el executor con más
# margen porque su carga es más impredecible (ráfagas de "Ejecutar"). ---
resource "aws_appautoscaling_target" "backend" {
  max_capacity       = var.backend_max_count
  min_capacity       = var.backend_desired_count
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "${var.name_prefix}-backend-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 60
  }
}

resource "aws_appautoscaling_target" "executor" {
  max_capacity       = var.executor_max_count
  min_capacity       = var.executor_desired_count
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.executor.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "executor_cpu" {
  name               = "${var.name_prefix}-executor-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.executor.resource_id
  scalable_dimension = aws_appautoscaling_target.executor.scalable_dimension
  service_namespace  = aws_appautoscaling_target.executor.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 50
  }
}
