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

-- 4. Crear la tabla 'historial_reporte' con folio como TEXT (PK y FK hacia reportes)
DROP TABLE IF EXISTS historial_reporte;
CREATE TABLE historial_reporte (
    folio TEXT,
    categoria_historial_id INT NOT NULL,
    titulo_id INT NOT NULL,
    notas TEXT,
    CONSTRAINT fk_historial_reporte 
        FOREIGN KEY (folio) 
        REFERENCES reportes(folio) 
        ON DELETE CASCADE,
    CONSTRAINT fk_historial_categoria 
        FOREIGN KEY (categoria_historial_id) 
        REFERENCES categoria_historial(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_historial_titulo 
        FOREIGN KEY (titulo_id) 
        REFERENCES titulo(id) 
        ON DELETE CASCADE
);

-- 5. Insertar las categorías en 'categoria_historial'
INSERT INTO categoria_historial (nombre) 
VALUES 
    ('Devolucion de reporte'),
    ('Rechazo de reporte');

-- 6. Insertar los títulos asociándolos dinámicamente con 'Devolucion de reporte'
INSERT INTO titulo (categoria_historial_id, nombre) 
VALUES 
    (
        (SELECT id FROM categoria_historial WHERE nombre = 'Devolucion de reporte' LIMIT 1), 
        'Datos inconsistentes'
    ),
    (
        (SELECT id FROM categoria_historial WHERE nombre = 'Devolucion de reporte' LIMIT 1), 
        'Asignacion incorrecta de Departamento'
    );