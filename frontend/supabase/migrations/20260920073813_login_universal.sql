CREATE OR REPLACE FUNCTION login_usuario(p_correo TEXT, p_contrasena TEXT)
RETURNS TABLE(
  id UUID, 
  nombre TEXT, 
  apellido_p TEXT,
  tipo_id INTEGER, 
  departamento_id INTEGER,
  estado TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, 
    u.nombre, 
    u.apellido_p,
    u.tipousuario_id,
    COALESCE(a.departamento_id, s.departamento_id) AS departamento_id,
    u.estadoadministrativo
  FROM usuarios u
  LEFT JOIN administradores a ON u.id = a.usuario_id
  LEFT JOIN supervisores s ON u.id = s.usuario_id
  WHERE u.correo = p_correo
  AND u.contrasena = extensions.crypt(p_contrasena, u.contrasena);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;