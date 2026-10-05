-- Agregar a la Tabla "estado_reporte" un nuevo estado llamado "Devuelto"

INSERT INTO estadoreporte (id, estado) VALUES (6, 'Devuelto');

-- Cambiar el estado "Llegado" a "Pendiente", "En Proceso" a "En Revisión"

UPDATE estadoreporte SET estado = 'Pendiente' WHERE estado = 'Llegado';
UPDATE estadoreporte SET estado = 'En Revisión' WHERE estado = 'En Proceso';