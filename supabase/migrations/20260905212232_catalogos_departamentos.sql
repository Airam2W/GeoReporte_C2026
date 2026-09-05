DROP TABLE IF EXISTS reportes;

CREATE TABLE departamentos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL
);

CREATE TABLE problemas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  departamento_id INTEGER REFERENCES departamentos(id) ON DELETE CASCADE
);

INSERT INTO departamentos (id, nombre) VALUES
(1, 'Limpia, Recolección, Tratamiento y Disposición Final de Residuos'),
(2, 'Parques y Jardines'),
(3, 'Alumbrado Público y Eficiencia Energética'),
(4, 'Mercados y Comercio de la Vía Pública'),
(5, 'Panteones'),
(6, 'Conservación y Mantenimiento de Infraestructura'),
(7, 'Sistemas de Drenaje Pluvial');

INSERT INTO problemas (nombre, departamento_id) VALUES
('Deficiencia en la cobertura de recolección', 1),
('Acumulación de residuos sólidos en vía pública', 1),
('Disposición clandestina en lotes baldíos', 1),
('Saturación del sitio de disposición final', 1),
('Obstrucción de alcantarillado por residuos', 1),
('Falta de mantenimiento preventivo a áreas verdes', 2),
('Mobiliario urbano deteriorado', 2),
('Proliferación de maleza', 2),
('Déficit de reforestación', 2),
('Rezago en poda y derribo de arbolado riesgoso', 2),
('Luminarias fuera de servicio', 3),
('Fallas en circuitos y transformadores', 3),
('Vandalismo y robo de infraestructura eléctrica', 3),
('Rezago en modernización a tecnología LED', 3),
('Tiempos de respuesta prolongados', 3),
('Comercio ambulante irregular', 4),
('Ocupación no autorizada de vía pública', 4),
('Infraestructura de mercados deteriorada', 4),
('Padrón de locatarios desactualizado', 4),
('Conflicto por uso de espacios públicos', 4),
('Saturación de espacios', 5),
('Falta de mantenimiento interior', 5),
('Vandalismo en tumbas', 5),
('Deterioro de infraestructura hidráulica y eléctrica', 5),
('Rezago en registro y control', 5),
('Deterioro de vialidades', 6),
('Banquetas y guarniciones dañadas', 6),
('Mobiliario urbano dañado', 6),
('Déficit de cuadrillas de conservación', 6),
('Rezago en mantenimiento de inmuebles municipales', 6),
('Azolve en rejillas pluviales y canales', 7),
('Cárcamos pluviales con fallas operativas', 7),
('Insuficiencia de infraestructura pluvial', 7),
('Inundaciones en zonas bajas', 7),
('Mezcla de drenaje pluvial y sanitario', 7);

CREATE TABLE reportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento_id INTEGER REFERENCES departamentos(id) NOT NULL,
  problema_id INTEGER REFERENCES problemas(id) NOT NULL,
  descripcion TEXT NOT NULL, 
  nombre TEXT DEFAULT 'Anónimo', 
  telefono TEXT NOT NULL, 
  domicilio TEXT NOT NULL,
  referencias TEXT,
  foto_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);