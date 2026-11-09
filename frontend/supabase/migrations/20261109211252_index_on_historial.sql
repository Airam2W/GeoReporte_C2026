-- Índice para ordenar y filtrar por fecha
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial (fecha DESC);

-- Historial inmutable: nadie puede editar ni borrar registros
CREATE OR REPLACE FUNCTION historial_inmutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'El historial no puede modificarse ni eliminarse';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_historial_no_update_delete
BEFORE UPDATE OR DELETE ON historial
FOR EACH ROW EXECUTE FUNCTION historial_inmutable();

CREATE TRIGGER trg_historial_no_truncate
BEFORE TRUNCATE ON historial
FOR EACH STATEMENT EXECUTE FUNCTION historial_inmutable();