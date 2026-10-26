-- Nuevos Catálogos
CREATE TABLE IF NOT EXISTS tipoUsuario (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

INSERT INTO tipoUsuario (id, nombre) VALUES
(1, 'DirectorGeneral'),
(2, 'Administrador'),
(3, 'Supervisor'),
(4, 'Jefe'),
(5, 'Trabajador'),
(6, 'Personal Externo');

CREATE TABLE IF NOT EXISTS estadoReporte(
    id SERIAL PRIMARY KEY,
    estado TEXT NOT NULL UNIQUE
);

INSERT INTO estadoReporte (id, estado) VALUES
(1, 'Llegado'),
(2, 'En Proceso'),
(3, 'Rechazado'),
(4, 'Finalizado'),
(5, 'Turnado');

-- Nueva tabla Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    apellido_p TEXT NOT NULL,
    apellido_m TEXT NULL,
    correo TEXT NOT NULL UNIQUE,
    contrasena TEXT NOT NULL,
    estadoAdministrativo TEXT DEFAULT 'Alta',
    tipoUsuario_id INTEGER REFERENCES tipoUsuario(id) ON DELETE SET NULL
);

-- Tablas externas
CREATE TABLE IF NOT EXISTS departamentos_externos (
    id SERIAL PRIMARY KEY,
    departamento TEXT NOT NULL UNIQUE
);

INSERT INTO departamentos_externos (departamento) VALUES
('JAPAC'),
('CFE');

CREATE TABLE IF NOT EXISTS problemas_externos (
    id SERIAL PRIMARY KEY,
    problema TEXT NOT NULL,
    dep_externo_id INTEGER REFERENCES departamentos_externos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS personal_externo (
    id SERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    dep_externo_id INTEGER REFERENCES departamentos_externos(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles
DROP TABLE IF EXISTS administradores CASCADE;

CREATE TABLE IF NOT EXISTS administradores (
    id SERIAL PRIMARY KEY,
    departamento_id INTEGER REFERENCES departamentos(id) ON DELETE RESTRICT,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supervisores (
    id SERIAL PRIMARY KEY,
    departamento_id INTEGER REFERENCES departamentos(id) ON DELETE RESTRICT,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jefes (
    id SERIAL PRIMARY KEY,
    supervisor_id INTEGER REFERENCES supervisores(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trabajadores (
    id SERIAL PRIMARY KEY,
    jefe_id INTEGER REFERENCES jefes(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla detalle de reportes
DROP TABLE IF EXISTS reportesexistentes CASCADE;

CREATE TABLE IF NOT EXISTS detalle_reporte (
    folio TEXT PRIMARY KEY REFERENCES reportes(folio) ON DELETE CASCADE,
    supervisor_id INTEGER REFERENCES supervisores(id) ON DELETE SET NULL,
    jefe_id INTEGER REFERENCES jefes(id) ON DELETE SET NULL,
    estado_id INTEGER REFERENCES estadoReporte(id) ON DELETE SET NULL,
    detalles TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS avances (
    folio TEXT REFERENCES reportes(folio) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comentarios TEXT NULL,
    foto_url TEXT NULL,
    PRIMARY KEY (folio, created_at)
);

-- Actualización función login_admin
CREATE OR REPLACE FUNCTION login_admin(p_correo TEXT, p_contrasena TEXT)
RETURNS TABLE(id UUID, nombre TEXT, departamento_id INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.nombre, a.departamento_id
  FROM administradores a
  JOIN usuarios u ON a.usuario_id = u.id
  WHERE u.correo = p_correo
  AND u.contrasena = extensions.crypt(p_contrasena, u.contrasena);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en la tabla detalle_reporte
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON detalle_reporte
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Inserción de Usuarios de prueba
INSERT INTO usuarios (nombre, apellido_p, apellido_m, correo, contrasena, tipoUsuario_id) VALUES
(
  'Jorge Guillermo', 
  'Moya', 'Palazuelos', 
  'jorge.mp@culiacan.tecnm.mx', 
  extensions.crypt('Combo123', extensions.gen_salt('bf')), 
  1
),
(
  'Cesar Yovanni', 
  'Inzunza', 
  'Aguilar', 
  'l22170685@culiacan.tecnm.mx', 
  extensions.crypt('Combo123', extensions.gen_salt('bf')),
  2
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
  2
),
(
  'Angel Amaury',
  'Arredondo',
  'Gonzalez',
  'l22170564@culiacan.tecnm.mx',
  extensions.crypt('Combo123', extensions.gen_salt('bf')),
  2
),
(
  'Jose Enrique',
  'Espindola',
  'Leyva',
  'l22170635@culiacan.tecnm.mx',
  extensions.crypt('Combo123', extensions.gen_salt('bf')),
  2
),
(
  'Pedro',
  'Chairez',
  'Audelo',
  'l20170634@culiacan.tecnm.mx',
  extensions.crypt('Combo123', extensions.gen_salt('bf')),
  2
),
(
  'Jose Leonel',
  'Gonzalez',
  'Lopez',
  'l22170985@culiacan.tecnm.mx',
  extensions.crypt('Combo123', extensions.gen_salt('bf')),
  2
)