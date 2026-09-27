-- 🔧 Paso 1: Alterar la tabla usuarios para columnas de control
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS fechaalta TIMESTAMP,
ADD COLUMN IF NOT EXISTS fechabaja TIMESTAMP,
ADD COLUMN IF NOT EXISTS estadoadministrativo TEXT;

-- 🔧 Paso 2: Alterar tablas de relaciones si no tienen columnas
ALTER TABLE jefes ADD COLUMN IF NOT EXISTS supervisor_id INT REFERENCES supervisores(id);
ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS jefe_id INT REFERENCES jefes(id);
ALTER TABLE personal_externo ADD COLUMN IF NOT EXISTS dep_externo_id INT REFERENCES departamentos_externos(id);

-- 🔧 Paso 3: Crear o reemplazar la función guardar_usuario
CREATE OR REPLACE FUNCTION guardar_usuario(
  p_id UUID,
  p_nombre TEXT,
  p_apellido_p TEXT,
  p_apellido_m TEXT,
  p_correo TEXT,
  p_contrasena TEXT,
  p_tipousuario_id INTEGER,
  p_departamento_id INTEGER,
  p_estado TEXT
) RETURNS UUID AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  IF p_id IS NULL THEN
    -- Nuevo usuario: se registra FechaAlta
    INSERT INTO usuarios (
      nombre, apellido_p, apellido_m, correo, contrasena,
      tipousuario_id, fechaalta, estadoadministrativo
    )
    VALUES (
      p_nombre, 
      p_apellido_p, 
      p_apellido_m, 
      p_correo,
      extensions.crypt(p_contrasena, extensions.gen_salt('bf')),
      p_tipousuario_id,
      now(),
      p_estado
    )
    ON CONFLICT (correo) DO UPDATE
    SET nombre = EXCLUDED.nombre,
        apellido_p = EXCLUDED.apellido_p,
        apellido_m = EXCLUDED.apellido_m,
        contrasena = EXCLUDED.contrasena,
        tipousuario_id = EXCLUDED.tipousuario_id,
        estadoadministrativo = EXCLUDED.estadoadministrativo
    RETURNING id INTO v_usuario_id;
  ELSE
    v_usuario_id := p_id;
    
    UPDATE usuarios 
    SET nombre = p_nombre, 
        apellido_p = p_apellido_p, 
        apellido_m = p_apellido_m, 
        correo = p_correo,
        tipousuario_id = p_tipousuario_id,
        estadoadministrativo = p_estado,
        -- si pasa de Alta a Baja, se marca FechaBaja
        fechabaja = CASE 
                      WHEN estadoadministrativo = 'Alta' AND p_estado = 'Baja' THEN now()
                      ELSE fechabaja
                    END,
        -- si pasa de Baja a Alta, se marca FechaAlta
        fechaalta = CASE 
                      WHEN estadoadministrativo = 'Baja' AND p_estado = 'Alta' THEN now()
                      ELSE fechaalta
                    END
    WHERE id = v_usuario_id;

    -- Actualizar contraseña si se puso una distinta
    IF p_contrasena IS NOT NULL AND p_contrasena <> '' THEN
      UPDATE usuarios 
      SET contrasena = extensions.crypt(p_contrasena, extensions.gen_salt('bf'))
      WHERE id = v_usuario_id;
    END IF;

    -- Borrar relaciones anteriores por si cambió de rol
    DELETE FROM administradores WHERE usuario_id = v_usuario_id;
    DELETE FROM supervisores WHERE usuario_id = v_usuario_id;
    DELETE FROM jefes WHERE usuario_id = v_usuario_id;
    DELETE FROM trabajadores WHERE usuario_id = v_usuario_id;
    DELETE FROM personal_externo WHERE usuario_id = v_usuario_id;
  END IF;

  -- Insertar relación según tipo de usuario
  IF p_tipousuario_id = 3 THEN
    INSERT INTO supervisores (departamento_id, usuario_id) VALUES (p_departamento_id, v_usuario_id);
  ELSIF p_tipousuario_id = 2 THEN
    INSERT INTO administradores (departamento_id, usuario_id) VALUES (p_departamento_id, v_usuario_id);
  ELSIF p_tipousuario_id = 4 THEN
    INSERT INTO jefes (supervisor_id, usuario_id) VALUES (p_departamento_id, v_usuario_id);
  ELSIF p_tipousuario_id = 5 THEN
    INSERT INTO trabajadores (jefe_id, usuario_id) VALUES (p_departamento_id, v_usuario_id);
  ELSIF p_tipousuario_id = 6 THEN
    INSERT INTO personal_externo (dep_externo_id, usuario_id) VALUES (p_departamento_id, v_usuario_id);
  END IF;

  RETURN v_usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
