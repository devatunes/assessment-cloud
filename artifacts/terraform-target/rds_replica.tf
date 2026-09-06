# Read Replica de la instancia existente, dedicada a lecturas pesadas
# (reportes, historial de candidatos, overview) — separa esa carga de las
# escrituras de intentos en vivo en la instancia primaria.

resource "aws_db_instance" "read_replica" {
  identifier          = "${var.name_prefix}-read-replica"
  replicate_source_db = var.db_instance_identifier

  instance_class = data.aws_db_instance.existing.db_instance_class

  # Hereda motor/versión/storage de la primaria automáticamente al ser réplica.
  publicly_accessible    = false
  vpc_security_group_ids = [aws_security_group.rds_proxy.id]

  skip_final_snapshot = true
  apply_immediately   = true

  tags = merge(var.tags, { Name = "${var.name_prefix}-read-replica" })
}
