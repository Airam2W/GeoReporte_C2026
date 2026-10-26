-- Agregar la columna 'fecha' a la tabla 'historial_reporte'
ALTER TABLE historial_reporte 
ADD COLUMN fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;