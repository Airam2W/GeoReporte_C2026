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

// 2. Tu lógica de Autenticación ajustada para trabajar con el usuario del JWT
export const validarAutenticacion = async (req, res, next) => {
    const user = req.user // Viene directamente del token verificado por el JWT

    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    const correoExistente = async (correo) => {
        const { data, error } = await supabase.from('usuarios').select('correo').eq('correo', correo).maybeSingle()
        if (error) return false
        return !!data
    }

    const altaExistente = async (correo) => {
        const { data, error } = await supabase.from('usuarios').select('estadoadministrativo').eq('correo', correo).maybeSingle()
        if (error) return false
        return data && data.estadoadministrativo === 'Alta'
    }

    if (!user || typeof user !== 'object' || !user.correo || !regexCorreo.test(user.correo) ||
        user.estado !== "Alta" || !(await correoExistente(user.correo)) || !(await altaExistente(user.correo))
    ) {
        console.log('Usuario no autenticado o estado inválido en BD.')
        return res.status(401).json({ ok: false, mensaje: 'No autorizado: Estado de usuario inválido.' })
    }

    next() // Todo bien, pasa al siguiente paso o ruta
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