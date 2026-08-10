variable "aws_region" {
  description = "Región de AWS donde se despliega todo."
  type        = string
  default     = "us-east-1"
}

variable "name_prefix" {
  description = "Prefijo para nombrar todos los recursos nuevos."
  type        = string
  default     = "assessment-target"
}

variable "vpc_cidr" {
  description = "CIDR de la VPC nueva y dedicada a esta arquitectura."
  type        = string
  default     = "10.30.0.0/16"
}

variable "az_count" {
  description = "Cantidad de availability zones a usar (mínimo 2 para el ALB)."
  type        = number
  default     = 2
}

# --- Base de datos existente (no se crea acá, ya corre en producción) ---

variable "db_instance_identifier" {
  description = "Identifier de la instancia RDS PostgreSQL ya existente que va detrás del RDS Proxy."
  type        = string
}

variable "db_secret_arn" {
  description = "ARN del secreto en Secrets Manager con las credenciales de la base (usuario/password) que usará RDS Proxy."
  type        = string
}

variable "db_name" {
  description = "Nombre de la base de datos."
  type        = string
  default     = "assessment"
}

# --- Backend (ECS Fargate) ---

variable "ecr_image_uri" {
  description = "URI completa de la imagen del backend ya publicada en ECR (mismo backend/Dockerfile del repo)."
  type        = string
}

variable "backend_cpu" {
  description = "vCPU del task del backend, en unidades Fargate (1024 = 1 vCPU)."
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Memoria del task del backend, en MB."
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Cantidad mínima de tasks del backend corriendo."
  type        = number
  default     = 2
}

variable "backend_max_count" {
  description = "Cantidad máxima de tasks del backend bajo auto scaling."
  type        = number
  default     = 10
}

# --- Executor (ECS Fargate, pool cálido) ---

variable "executor_image_uri" {
  description = "URI completa de la imagen del executor ya publicada en ECR."
  type        = string
}

variable "executor_cpu" {
  description = "vCPU del task del executor, en unidades Fargate."
  type        = number
  default     = 256
}

variable "executor_memory" {
  description = "Memoria del task del executor, en MB."
  type        = number
  default     = 512
}

variable "executor_desired_count" {
  description = "Tamaño del pool cálido del executor (tasks siempre corriendo)."
  type        = number
  default     = 2
}

variable "executor_max_count" {
  description = "Tamaño máximo del pool del executor bajo auto scaling."
  type        = number
  default     = 8
}

variable "tags" {
  description = "Tags comunes para todos los recursos."
  type        = map(string)
  default     = {}
}
