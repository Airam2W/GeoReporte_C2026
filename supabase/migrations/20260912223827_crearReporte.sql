CREATE TABLE departamentos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  nombreAmigable TEXT NOT NULL
);

CREATE TABLE problemas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  nombreAmigable TEXT NOT NULL,
  departamento_id INTEGER REFERENCES departamentos(id) ON DELETE CASCADE
);

INSERT INTO departamentos (id, nombre, nombreAmigable) VALUES
(1, 'Limpia, Recolección, Tratamiento y Disposición Final de Residuos', 'Basura y Limpieza'),
(2, 'Parques y Jardines', 'Áreas verdes y parques'),
(3, 'Alumbrado Público y Eficiencia Energética', 'Alumbrado público'),
(4, 'Mercados y Comercio de la Vía Pública', 'Mercados y comercio callejero'),
(5, 'Panteones', 'Panteones'),
(6, 'Conservación y Mantenimiento de Infraestructura', 'Calles y obras públicas'),
(7, 'Sistemas de Drenaje Pluvial', 'Drenaje y alcantarillado');


INSERT INTO problemas (nombre, nombreAmigable, departamento_id) VALUES
('Deficiencia en la cobertura de recolección', 'No pasa el camión de basura', 1),
('Acumulación de residuos sólidos en vía pública', 'Basura acumulada en la calle', 1),
('Disposición clandestina en lotes baldíos', 'Tiradero ilegal en baldío', 1),
('Saturación del sitio de disposición final', 'Basurero saturado', 1),
('Obstrucción de alcantarillado por residuos', 'Basura tapando alcantarilla', 1),

('Falta de mantenimiento preventivo a áreas verdes', 'Áreas verdes descuidadas', 2),
('Mobiliario urbano deteriorado', 'Bancas o juegos dañados', 2),
('Proliferación de maleza', 'Maleza crecida', 2),
('Déficit de reforestación', 'Falta de árboles', 2),
('Rezago en poda y derribo de arbolado riesgoso', 'Árboles sin poda o peligrosos', 2),

('Luminarias fuera de servicio', 'Focos fundidos', 3),
('Fallas en circuitos y transformadores', 'Fallas eléctricas en alumbrado', 3),
('Vandalismo y robo de infraestructura eléctrica', 'Robo o daño en alumbrado', 3),
('Rezago en modernización a tecnología LED', 'Falta de lámparas LED', 3),
('Tiempos de respuesta prolongados', 'Tardan en reparar alumbrado', 3),

('Comercio ambulante irregular', 'Puestos callejeros sin permiso', 4),
('Ocupación no autorizada de vía pública', 'Uso indebido de la calle', 4),
('Infraestructura de mercados deteriorada', 'Mercado en mal estado', 4),
('Padrón de locatarios desactualizado', 'Registro de locatarios incompleto', 4),
('Conflicto por uso de espacios públicos', 'Pleito por espacios públicos', 4),

('Saturación de espacios', 'Panteón lleno', 5),
('Falta de mantenimiento interior', 'Panteón descuidado', 5),
('Vandalismo en tumbas', 'Tumbas vandalizadas', 5),
('Deterioro de infraestructura hidráulica y eléctrica', 'Servicios dañados en panteón', 5),
('Rezago en registro y control', 'Registro de tumbas atrasado', 5),

('Deterioro de vialidades', 'Calles dañadas', 6),
('Banquetas y guarniciones dañadas', 'Banquetas rotas', 6),
('Mobiliario urbano dañado', 'Mobiliario público dañado', 6),
('Déficit de cuadrillas de conservación', 'Falta de personal de mantenimiento', 6),
('Rezago en mantenimiento de inmuebles municipales', 'Edificios municipales descuidados', 6),

('Azolve en rejillas pluviales y canales', 'Alcantarillas tapadas', 7),
('Cárcamos pluviales con fallas operativas', 'Bombas pluviales fallando', 7),
('Insuficiencia de infraestructura pluvial', 'Falta de drenaje pluvial', 7),
('Inundaciones en zonas bajas', 'Inundaciones en calles', 7),
('Mezcla de drenaje pluvial y sanitario', 'Drenaje pluvial mezclado con sanitario', 7);


CREATE TABLE reportes (
  folio TEXT PRIMARY KEY,
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