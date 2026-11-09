CREATE INDEX IF NOT EXISTS idx_reportes_duplicados
ON reportes (departamento_id, problema_id, latitud, longitud);