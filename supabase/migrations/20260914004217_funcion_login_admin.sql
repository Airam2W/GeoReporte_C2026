CREATE OR REPLACE FUNCTION login_admin(p_correo TEXT, p_contrasena TEXT)
RETURNS TABLE(id UUID, nombre TEXT, departamento_id INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.nombre, a.departamento_id
  FROM administradores a
  WHERE a.correo = p_correo
  AND a.contrasena = extensions.crypt(p_contrasena, a.contrasena);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;