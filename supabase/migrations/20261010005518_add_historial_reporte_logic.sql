-- 1. Eliminar la columna 'detalles' de la tabla existente 'detalle_reporte'
ALTER TABLE detalle_reporte 
DROP COLUMN IF EXISTS detalles;

-- 2. Crear la tabla 'categoria_historial'
CREATE TABLE IF NOT EXISTS categoria_historial (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL
);

-- 3. Crear la tabla 'titulo'
CREATE TABLE IF NOT EXISTS titulo (
    id SERIAL PRIMARY KEY,
    categoria_historial_id INT NOT NULL,
    nombre TEXT NOT NULL,
    CONSTRAINT fk_titulo_categoria 
        FOREIGN KEY (categoria_historial_id) 
        REFERENCES categoria_historial(id) 
        ON DELETE CASCADE
);

-- 4. Crear la tabla 'historial_reporte'
CREATE TABLE IF NOT EXISTS historial_reporte (
    folio SERIAL PRIMARY KEY,
    categoria_historial_id INT NOT NULL,
    titulo_id INT NOT NULL,
    notas TEXT,
    CONSTRAINT fk_historial_categoria 
        FOREIGN KEY (categoria_historial_id) 
        REFERENCES categoria_historial(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_historial_titulo 
        FOREIGN KEY (titulo_id) 
        REFERENCES titulo(id) 
        ON DELETE CASCADE
);