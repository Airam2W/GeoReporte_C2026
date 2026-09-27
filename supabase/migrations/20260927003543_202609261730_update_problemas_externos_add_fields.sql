ALTER TABLE problemas_externos
  DROP COLUMN dep_externo_id,
  ADD COLUMN IF NOT EXISTS nombre TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS nombreamigable TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS departamento_externo_id INT REFERENCES departamentos_externos(id);


INSERT INTO problemas_externos (nombre, nombreamigable, departamento_externo_id) VALUES
('Fugas en la red de distribución de agua potable', 'Fuga de agua en la calle', 1),
('Baja presión en el suministro de agua', 'Agua sale con poca fuerza', 1),
('Obstrucción en drenaje sanitario', 'Drenaje tapado', 1),
('Contaminación en fuentes de agua', 'Agua sucia o con mal olor', 1),
('Interrupción del servicio por mantenimiento', 'Corte de agua programado', 1);

INSERT INTO problemas_externos (nombre, nombreamigable, departamento_externo_id) VALUES
('Interrupción del suministro eléctrico', 'Apagón en la colonia', 2),
('Fluctuaciones de voltaje en la red', 'Luz baja o intermitente', 2),
('Fallas en transformadores de distribución', 'Transformador dañado', 2),
('Sobrecarga en líneas de transmisión', 'Cables saturados o sobrecargados', 2),
('Robo o vandalismo de infraestructura eléctrica', 'Cables robados o dañados', 2);
