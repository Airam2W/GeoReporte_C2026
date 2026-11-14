-- 1. Agregar la columna 'prioridad' con un valor por defecto de 3 (Media)
ALTER TABLE reportes
ADD COLUMN prioridad SMALLINT NOT NULL DEFAULT 3;

-- 2. (Opcional pero recomendado) Agregar una restricción para asegurar que solo acepte valores válidos (ej. 1: Muy Alta, 2: Alta, 3: Media, 4: Baja, 5: Muy Baja)
ALTER TABLE reportes
ADD CONSTRAINT chk_prioridad_valida CHECK (prioridad IN (1, 2, 3, 4, 5));