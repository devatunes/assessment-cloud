output "alb_dns_name" {
  description = "Dominio público del Application Load Balancer (apunta aquí el frontend en vez de a API Gateway)."
  value       = aws_lb.backend.dns_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "db_proxy_endpoint" {
  description = "Endpoint del RDS Proxy — es lo que debe usarse como DB_HOST del backend, no el endpoint directo de RDS."
  value       = aws_db_proxy.this.endpoint
}

output "read_replica_endpoint" {
  value = aws_db_instance.read_replica.address
}

output "vpc_id" {
  value = aws_vpc.this.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
