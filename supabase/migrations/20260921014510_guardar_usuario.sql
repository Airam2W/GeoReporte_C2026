CREATE OR REPLACE FUNCTION guardar_usuario(
  p_id UUID,
  p_nombre TEXT,
  p_apellido_p TEXT,
  p_apellido_m TEXT,
  p_correo TEXT,
  p_contrasena TEXT,
  p_tipousuario_id INTEGER,
  p_departamento_id INTEGER
) RETURNS UUID AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO usuarios (nombre, apellido_p, apellido_m, correo, contrasena, tipousuario_id)
    VALUES (
      p_nombre, 
      p_apellido_p, 
      p_apellido_m, 
      p_correo,
      extensions.crypt(p_contrasena, extensions.gen_salt('bf')),
      p_tipousuario_id
    ) RETURNING id INTO v_usuario_id;

  ELSE
    v_usuario_id := p_id;
    
    UPDATE usuarios 
    SET nombre = p_nombre, 
        apellido_p = p_apellido_p, 
        apellido_m = p_apellido_m, 
        correo = p_correo,
        tipousuario_id = p_tipousuario_id
    WHERE id = v_usuario_id;

    -- Actualizar contraseña si se puso una distinta
    IF p_contrasena IS NOT NULL AND p_contrasena <> '' THEN
      UPDATE usuarios 
      SET contrasena = extensions.crypt(p_contrasena, extensions.gen_salt('bf'))
      WHERE id = v_usuario_id;
    END IF;

    -- Borramr las relaciones anteriores por si el usuario cambió de rol
    DELETE FROM administradores WHERE usuario_id = v_usuario_id;
    DELETE FROM supervisores WHERE usuario_id = v_usuario_id;
    DELETE FROM jefes WHERE usuario_id = v_usuario_id;
    DELETE FROM trabajadores WHERE usuario_id = v_usuario_id;
  END IF;

  IF p_tipousuario_id = 2 THEN
    INSERT INTO administradores (departamento_id, usuario_id) VALUES (p_departamento_id, v_usuario_id);
  ELSIF p_tipousuario_id = 3 THEN
    INSERT INTO supervisores (departamento_id, usuario_id) VALUES (p_departamento_id, v_usuario_id);
  END IF;

  RETURN v_usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;