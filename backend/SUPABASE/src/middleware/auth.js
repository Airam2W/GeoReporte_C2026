import jwt from 'jsonwebtoken'
// Asegúrate de importar tu cliente de Supabase configurado
import { supabase } from '../config/supabase.js' // Ajusta la ruta según tu estructura de proyecto

// 1. Middleware que intercepta el Header "Authorization: Bearer <token>"
export const verificarTokenJWT = async (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Formato: Bearer TOKEN

    if (!token) {
        return res.status(401).json({ ok: false, mensaje: 'Acceso denegado. No se proporcionó un token.' })
    }

    try {
        // Verificamos el token usando el secreto del .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        
        // Inyectamos los datos del usuario decodificados en la petición (ej. correo, tipo_id)
        req.user = decoded 
        next()
    } catch (error) {
        console.error('Error al verificar el JWT:', error.message)
        return res.status(403).json({ ok: false, mensaje: 'Token inválido o expirado.' })
    }
}

// 2. Middleware que valida la autenticación y el estado del usuario
export const validarAutenticacion = async (req, res, next) => {
    const user = req.user // Viene directamente del token verificado por el JWT
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    // 1. Validación inicial: Token válido, estructura correcta, regex de correo 
    // y doble validación del estado directamente en el token (user.estado)
    if (
        !user || 
        typeof user !== 'object' || 
        !user.correo || 
        !regexCorreo.test(user.correo) || 
        user.estado !== 'Alta'
    ) {
        console.log('Validación fallida: Token inválido, correo mal formateado o user.estado no es Alta.')
        return res.status(401).json({ ok: false, mensaje: 'No autorizado: Sesión inválida o inactiva.' })
    }

    try {
        // 2. Segunda validación en tiempo real: Verificar existencia del correo 
        // y que su estadoadministrativo en la Base de Datos sea 'Alta'
        const { data, error } = await supabase
            .from('usuarios')
            .select('estadoadministrativo')
            .eq('correo', user.correo)
            .maybeSingle()

        // Si hay error, si no devolvió registro (no existe el correo) o si el estado en BD no es Alta
        if (error || !data || data.estadoadministrativo !== 'Alta') {
            console.log('Validación fallida en BD: El correo no existe o su estadoadministrativo no es Alta.')
            return res.status(401).json({ ok: false, mensaje: 'No autorizado: Usuario no activo en el sistema.' })
        }

        // ¡Todo correcto! Pasa a la siguiente ruta o controlador
        next()
        
    } catch (err) {
        console.error('Error interno al consultar Supabase en el middleware:', err)
        return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor al validar autenticación.' })
    }
}

// 3. Tu lógica de Autorización por roles ajustada
export const validarAutorizacion = (rolesPermitidos = []) => {
    return async (req, res, next) => {
        const user = req.user

        if (!user || typeof user !== 'object' || !user.tipo_id || !rolesPermitidos.includes(user.tipo_id)) {
            return res.status(403).json({ ok: false, mensaje: 'Acceso no autorizado para este rol.' })
        }

        const validarRolEnBaseDeDatos = async (correo, tipo_id) => {
            const { data, error } = await supabase.from('usuarios').select('tipousuario_id').eq('correo', correo).maybeSingle()
            if (error) return false
            return data && data.tipousuario_id === tipo_id
        }

        if (!(await validarRolEnBaseDeDatos(user.correo, user.tipo_id))) {
            return res.status(403).json({ ok: false, mensaje: 'El rol en la base de datos no coincide.' })
        }

        next()
    }
}