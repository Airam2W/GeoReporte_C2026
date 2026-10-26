-- 🔧 Crear vista para recuperar usuarios con su relación
CREATE OR REPLACE VIEW usuarios_detalle AS
SELECT u.id,
       u.nombre,
       u.apellido_p,
       u.apellido_m,
       u.correo,
       u.tipousuario_id,
       u.estadoadministrativo,
       u.fechaalta,
       u.fechabaja,
       CASE 
         WHEN u.tipousuario_id = 2 THEN s.departamento_id
         WHEN u.tipousuario_id = 3 THEN a.departamento_id
         WHEN u.tipousuario_id = 4 THEN j.supervisor_id
         WHEN u.tipousuario_id = 5 THEN t.jefe_id
         WHEN u.tipousuario_id = 6 THEN pe.dep_externo_id
       END AS departamento_id
FROM usuarios u
LEFT JOIN supervisores s ON s.usuario_id = u.id
LEFT JOIN administradores a ON a.usuario_id = u.id
LEFT JOIN jefes j ON j.usuario_id = u.id
LEFT JOIN trabajadores t ON t.usuario_id = u.id
LEFT JOIN personal_externo pe ON pe.usuario_id = u.id;
