CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

CREATE TABLE administradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellido_p TEXT NOT NULL,
  apellido_m TEXT NULL,
  correo TEXT UNIQUE NOT NULL,
  contrasena TEXT NOT NULL, 
  departamento_id INTEGER REFERENCES departamentos(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO administradores (nombre, apellido_p, apellido_m, correo, contrasena, departamento_id) 
VALUES (
  'Cesar Yovanni', 
  'Inzunza', 
  'Aguilar', 
  'l22170685@culiacan.tecnm.mx', 
  extensions.crypt('Combo123', extensions.gen_salt('bf')), -- Contraseña encriptada
  1
),
(
  'Guillermo', 
  'Gonzalez', 
  'Cardenas', 
  'l22170672@culiacan.tecnm.mx',
  extensions.crypt('Combo123', extensions.gen_salt('bf')),
  2
),
(
  'Airam',
  'Aarmenta',
  'Vazquez',
  'l21170247@culiacan.tecnm.mx',
  extensions.crypt('Combo123', extensions.gen_salt('bf')),
  3
),
(
  'Angel Amaury',
  'Arredondo',
  'Gonzalez',
  'l22170564@culiacan.tecnm.mx',
  extensions.crypt('Combo123', extensions.gen_salt('bf')),
  4
),
(
  'Jose Enrique',
  'Espindola',
  'Leyva',
  'l22170635@culiacan.tecnm.mx',
  extensions.crypt('Combo123', extensions.gen_salt('bf')),
  5
),
(
  'Pedro',
  'Chairez',
  'Audelo',
  'l20170634@culiacan.tecnm.mx',
  extensions.crypt('Combo123', extensions.gen_salt('bf')),
  6
),
(
  'Jose Leonel',
  'Gonzalez',
  'Lopez',
  'l22170985@culiacan.tecnm.mx',
  extensions.crypt('Combo123', extensions.gen_salt('bf')),
  7
)