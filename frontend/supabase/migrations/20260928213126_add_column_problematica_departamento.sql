-- Tabla problemas
ALTER TABLE problemas
  ADD COLUMN estado TEXT DEFAULT 'Alta' CHECK (estado IN ('Alta', 'Baja'));

-- Tabla problemas_externos
ALTER TABLE problemas_externos
  ADD COLUMN estado TEXT DEFAULT 'Alta' CHECK (estado IN ('Alta', 'Baja'));

-- Tabla departamentos
ALTER TABLE departamentos
  ADD COLUMN estado TEXT DEFAULT 'Alta' CHECK (estado IN ('Alta', 'Baja'));

-- Tabla departamentos_externos
ALTER TABLE departamentos_externos
  ADD COLUMN estado TEXT DEFAULT 'Alta' CHECK (estado IN ('Alta', 'Baja'));