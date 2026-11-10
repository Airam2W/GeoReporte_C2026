
import { Router } from 'express'
import { supabase } from '../config/supabase.js'
import { responder } from '../helpers/response.js'
import jwt from 'jsonwebtoken'
import { verificarTurnstile } from '../middleware/verificarTurnstile.js'
import { registrarHistorial } from '../utils/registrarHistorial.js'
import { obtenerUsuario } from '../utils/obtenerUsuario.js'
import { estadoIDAAccion, estadoIDADetalle, categoriaHistorialIDAAccion, categoriaHistorialIDADetalle } from '../utils/convertirATexto.js'

import {
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion
} from '../middleware/auth.js'

const router = Router()

// ----------------------------------------- FUNCIONES AUXILIARES -----------------------------------------

const esObjetoValido = (data) => {
    return data !== null &&
        typeof data === 'object' &&
        !Array.isArray(data)
}

const esTextoValido = (valor) => {
    return typeof valor === 'string' && valor.trim().length > 0
}

const esIdValido = (valor) => {
    // id -> number | string(numeros y letras y caracteres especiales)
    return (
        (typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0) ||
        (typeof valor === 'string' && /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(valor) && valor.trim().length > 0)
    )
}

const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const responderErrorInterno = (res, mensaje, error) => {
    console.error(mensaje, error)

    return res.status(500).json({
        data: null,
        error: {
            message: mensaje
        }
    })
}


// Maneja errores inesperados de los endpoints sin ocultar sus consultas.
function manejarErrores(handler) {
    return async (req, res) => {
        try {
            await handler(req, res)
        } catch (error) {
            console.error(`Error en ${req.method} ${req.originalUrl}:`, error)

            if (!res.headersSent) {
                return res.status(500).json({
                    data: null,
                    error: { message: 'Error interno del servidor.' }
                })
            }
        }
    }
}

const estadoDelReporte = (r) => {
    const detalle = Array.isArray(r.detalle_reporte) ? r.detalle_reporte[0] : r.detalle_reporte
    return detalle?.estado_id
}

// ----------------------------------------- ENDPOINTS -----------------------------------------

// (obtenerUsuarioPorCorreoYContrasena)
router.post('/usuarios/CorreoContrasena', manejarErrores(async (req, res) => {
    const { p_correo, p_contrasena } = req.body

    if (
        typeof p_correo !== 'string' ||
        typeof p_contrasena !== 'string' ||
        !p_correo.trim() ||
        !p_contrasena
    ) {
        return res.status(400).json({
            data: null,
            error: { message: 'Correo y contraseña son obligatorios.' }
        })
    }

    const correo = p_correo.trim().toLowerCase()
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!correoRegex.test(correo)) {
        return res.status(400).json({
            data: null,
            error: { message: 'El formato del correo es inválido.' }
        })
    }

    if (p_contrasena.length < 6) {
        return res.status(400).json({
            data: null,
            error: { message: 'La contraseña debe tener al menos 6 caracteres.' }
        })
    }

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET no está configurado.')
        return res.status(500).json({
            data: null,
            error: { message: 'Error interno del servidor.' }
        })
    }

    const { data, error } = await supabase.rpc('login_usuario', {
        p_correo: correo,
        p_contrasena
    })

    if (error) {
        console.error('Error en RPC login_usuario:', error)
        return res.status(500).json({
            data: null,
            error: { message: 'No fue posible iniciar sesión.' }
        })
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
        return res.status(401).json({
            data: null,
            error: { message: 'Credenciales inválidas.' }
        })
    }

    const usuario = Array.isArray(data) ? data[0] : data

    if (
        !usuario.id ||
        (usuario.tipousuario_id == null && usuario.tipo_id == null)
    ) {
        console.error('La RPC login_usuario devolvió datos incompletos.')
        return res.status(500).json({
            data: null,
            error: { message: 'No fue posible iniciar sesión.' }
        })
    }

    if (usuario.estado !== 'Alta') {
        return res.status(403).json({
            data: null,
            error: { message: 'Tu usuario no se encuentra activo.' }
        })
    }

    const tipo_id = Number(usuario.tipousuario_id ?? usuario.tipo_id)

    if (!Number.isSafeInteger(tipo_id) || tipo_id <= 0) {
        console.error('El usuario tiene un tipo de usuario inválido.')
        return res.status(500).json({
            data: null,
            error: { message: 'No fue posible iniciar sesión.' }
        })
    }

    // ─────────────────────────────────────────────────────────────────
    // NUEVA LÓGICA: Enriquecer según el rol (Supervisor o Jefe)
    // ─────────────────────────────────────────────────────────────────
    let id_supervisor = null;
    let id_jefe = null;
    let departamento_id = usuario.departamento_id;

    if (tipo_id === 3) { // Supervisor
        const { data: supData, error: supError } = await supabase
            .from('supervisores')
            .select('id, departamento_id')
            .eq('usuario_id', usuario.id)
            .maybeSingle()

        if (!supError && supData) {
            id_supervisor = supData.id;
            if (!departamento_id) departamento_id = supData.departamento_id;
        }
    } else if (tipo_id === 4) { // Jefe
        const { data: jefeData, error: jefeError } = await supabase
            .from('jefes')
            .select('id, supervisor_id, supervisores(departamento_id)')
            .eq('usuario_id', usuario.id)
            .maybeSingle()

        if (!jefeError && jefeData) {
            id_jefe = jefeData.id;
            // Si la estructura te trae el departamento a través de la relación de supervisor
            if (!departamento_id && jefeData.supervisores) {
                departamento_id = Array.isArray(jefeData.supervisores)
                    ? jefeData.supervisores[0]?.departamento_id
                    : jefeData.supervisores?.departamento_id;
            }
        }
    }

    // Objeto consolidado para la respuesta y el token
    const usuarioRespuesta = {
        ...usuario,
        correo,
        departamento_id,
        ...(id_supervisor && { id_supervisor }),
        ...(id_jefe && { id_jefe })
    }

    const token = jwt.sign(
        {
            apellido_p: usuario.apellido_p,
            departamento_id,
            id: usuario.id,
            nombre: usuario.nombre,
            correo,
            tipo_id,
            estado: usuario.estado,
            ...(id_supervisor && { id_supervisor }),
            ...(id_jefe && { id_jefe })
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    )

    // Si todo es correcto, lo agregamos al historial del sistema
    const correoUsuario = correo || 'Sin correo';
    // Convertir a String para evitar problemas si es null o undefined
    const correoUsuarioString = String(correoUsuario);
    await registrarHistorial(correoUsuarioString, {
        accion: 'Entrar',
        entidad: 'Sistema',
        detalles: `El usuario ${usuario.nombre} ${usuario.apellido_p} ha entrado al sistema.`
    })


    return res.status(200).json({
        data: {
            usuario: usuarioRespuesta,
            token
        },
        error: null
    })
}))

// (guardarUsuario)
router.post(
    '/usuario',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { data } = req.body

            const {
                p_id,
                p_nombre,
                p_apellido_p,
                p_apellido_m,
                p_correo,
                p_contrasena,
                p_tipousuario_id,
                p_departamento_id,
                p_estado
            } = data || {}

            // Validación del objeto data.
            if (!esObjetoValido(data)) {
                return res.status(400).json({
                    error: 'Los datos del usuario no son válidos.'
                })
            }

            // Validación de ID.
            if (
                p_id !== null &&
                !esIdValido(p_id)
            ) {
                return res.status(400).json({
                    error: 'ID inválido. Debe ser un número entero positivo o null.'
                })
            }

            // Validación de nombre.
            if (!esTextoValido(p_nombre)) {
                return res.status(400).json({
                    error: 'Nombre inválido. Debe ser un texto no vacío.'
                })
            }

            // Validación de apellido paterno.
            if (!esTextoValido(p_apellido_p)) {
                return res.status(400).json({
                    error: 'Apellido paterno inválido. Debe ser un texto no vacío.'
                })
            }

            // Validación de apellido materno.
            if (
                p_apellido_m !== null &&
                !esTextoValido(p_apellido_m)
            ) {
                return res.status(400).json({
                    error: 'Apellido materno inválido. Debe ser un texto o null.'
                })
            }

            // Validación de correo.
            if (
                !esTextoValido(p_correo) ||
                !correoRegex.test(p_correo.trim())
            ) {
                return res.status(400).json({
                    error: 'Correo inválido. Debe tener un formato de correo válido.'
                })
            }

            // Validación de contraseña.
            if (
                p_contrasena !== null &&
                p_contrasena !== '' && // 👈 Permitir cadena vacía para indicar "sin cambios"
                (
                    typeof p_contrasena !== 'string' ||
                    p_contrasena.length < 6
                )
            ) {
                return res.status(400).json({
                    error: 'La contraseña debe tener al menos 6 caracteres o dejarse en blanco.'
                })
            }

            const contrasenaLimpia = (typeof p_contrasena === 'string' && p_contrasena.trim().length > 0)
                ? p_contrasena
                : null;

            // Validación de tipo de usuario.
            if (!esIdValido(p_tipousuario_id)) {
                return res.status(400).json({
                    error: 'Tipo de usuario inválido. Debe ser un número entero positivo.'
                })
            }

            // Validación de departamento.
            if (
                p_departamento_id !== null &&
                !esIdValido(p_departamento_id)
            ) {
                return res.status(400).json({
                    error: 'Departamento inválido. Debe ser un número entero positivo o null.'
                })
            }

            // Validación de estado.
            if (p_estado !== 'Alta' && p_estado !== 'Baja') {
                return res.status(400).json({
                    error: 'Estado inválido. Debe ser Alta o Baja.'
                })
            }

            // Construcción y ejecución de la consulta.
            const result = await supabase.rpc('guardar_usuario', {
                p_id,
                p_nombre,
                p_apellido_p,
                p_apellido_m,
                p_correo: p_correo.trim(),
                p_contrasena: contrasenaLimpia,
                p_tipousuario_id,
                p_departamento_id,
                p_estado
            })

            // Si todo es correcto, lo agregamos al historial del sistema
            const correoUsuario = obtenerUsuario(req)
            await registrarHistorial(correoUsuario, {
                accion: 'Actualizar',
                entidad: 'Usuario',
                detalles: `Actualizo el usuario ${p_nombre} ${p_apellido_p}.`
            })

            return responder(res, result)

        } catch (error) {
            return responderErrorInterno(
                res,
                'Error interno al guardar el usuario.',
                error
            )
        }
    }
)


// (crearReporte)
// Endpoint público: no requiere autenticación ni autorización.
router.post('/reporte', verificarTurnstile, async (req, res) => {
    try {
        const data = req.body

        // Validación del objeto data.
        if (!esObjetoValido(data)) {
            return res.status(400).json({
                error: 'Datos de reporte no proporcionados o tipo inválido.'
            })
        }

        // Validación de folio.
        if (!esTextoValido(data.folio)) {
            return res.status(400).json({
                error: 'Folio no proporcionado o inválido.'
            })
        }

        // Validación de departamento.
        if (!esIdValido(data.departamento_id)) {
            return res.status(400).json({
                error: 'Departamento ID inválido. Debe ser un número entero positivo.'
            })
        }

        // Validación de problema.
        if (!esIdValido(data.problema_id)) {
            return res.status(400).json({
                error: 'Problema ID inválido. Debe ser un número entero positivo.'
            })
        }

        // Validación de descripción.
        if (!esTextoValido(data.descripcion)) {
            return res.status(400).json({
                error: 'Descripción no proporcionada o inválida.'
            })
        }

        // Validación de nombre.
        if (!esTextoValido(data.nombre)) {
            return res.status(400).json({
                error: 'Nombre no proporcionado o inválido.'
            })
        }

        // Validación de teléfono.
        if (
            typeof data.telefono !== 'string' ||
            !/^\d{10}$/.test(data.telefono)
        ) {
            return res.status(400).json({
                error: 'El teléfono debe contener exactamente 10 dígitos.'
            })
        }

        // Validación de correo.
        if (
            data.correo !== undefined &&
            data.correo !== null &&
            data.correo !== '' &&
            (
                typeof data.correo !== 'string' ||
                !correoRegex.test(data.correo.trim())
            )
        ) {
            return res.status(400).json({
                error: 'Correo inválido. Ingresa un correo válido o déjalo vacío.'
            })
        }

        // Validación de domicilio.
        if (!esTextoValido(data.domicilio)) {
            return res.status(400).json({
                error: 'Domicilio no proporcionado o inválido.'
            })
        }

        // Validación de referencias.
        if (
            data.referencias !== undefined &&
            data.referencias !== null &&
            typeof data.referencias !== 'string'
        ) {
            return res.status(400).json({
                error: 'Las referencias deben ser un texto o null.'
            })
        }

        // Validación de foto URL.
        if (
            data.foto_url !== undefined &&
            data.foto_url !== null &&
            typeof data.foto_url !== 'string'
        ) {
            return res.status(400).json({
                error: 'La foto URL debe ser un texto o null.'
            })
        }

        // Validación de fotoTipoID.
        if (
            data.fotoTipoID !== undefined &&
            data.fotoTipoID !== null &&
            !(data.fotoTipoID == 0 || data.fotoTipoID == 1 || data.fotoTipoID == 2)
        ) {
            return res.status(400).json({
                error: 'Foto Tipo ID inválido. Debe ser un número entero positivo o null.'
            })
        }

        // Validación de mensajeAI.
        if (
            data.mensajeAI !== undefined &&
            data.mensajeAI !== null &&
            typeof data.mensajeAI !== 'string'
        ) {
            return res.status(400).json({
                error: 'El mensaje AI debe ser un texto o null.'
            })
        }

        // Validación de coordenadas (el frontend las valida, pero aquí se repite por seguridad).
        if (
            typeof data.latitud !== 'number' || !Number.isFinite(data.latitud) ||
            typeof data.longitud !== 'number' || !Number.isFinite(data.longitud) ||
            data.latitud < LIMITES_CULIACAN.minLat || data.latitud > LIMITES_CULIACAN.maxLat ||
            data.longitud < LIMITES_CULIACAN.minLng || data.longitud > LIMITES_CULIACAN.maxLng
        ) {
            return res.status(400).json({
                error: 'Ubicación inválida o fuera de Culiacán.'
            })
        }

        // Detección de reportes duplicados: mismo departamento, misma problemática y a 5 m o menos.
        // Primero se acota con un rectángulo para no traer toda la tabla; la distancia exacta se calcula después.
        const margenMetros = DISTANCIA_DUPLICADO_METROS * 2
        const margenLat = margenMetros / 111320
        const margenLng = margenMetros / (111320 * Math.cos(aRadianes(data.latitud)))

        const { data: cercanos, error: errorCercanos } = await supabase
            .from('reportes')
            .select('folio, latitud, longitud, detalle_reporte (estado_id)')
            .eq('departamento_id', data.departamento_id)
            .eq('problema_id', data.problema_id)
            .gte('latitud', data.latitud - margenLat)
            .lte('latitud', data.latitud + margenLat)
            .gte('longitud', data.longitud - margenLng)
            .lte('longitud', data.longitud + margenLng)

        if (errorCercanos) return responder(res, { data: null, error: errorCercanos })

        const hayDuplicado = (cercanos || []).some(
            (r) =>
                !ESTADOS_CERRADOS.includes(estadoDelReporte(r)) &&
                distanciaMetros(data.latitud, data.longitud, r.latitud, r.longitud) <= DISTANCIA_DUPLICADO_METROS
        )

        if (hayDuplicado) {
            return res.status(409).json({
                data: null,
                error: {
                    code: 'REPORTE_DUPLICADO',
                    message:
                        'Parece que este problema ya fue reportado en este mismo punto y sigue en atención. ' +
                        'Para evitar duplicados, tu reporte no fue enviado. Puedes revisar en el mapa los reportes cercanos. ¡Gracias por ayudarnos a mejorar Culiacán!'
                }
            })
        }

        // Construcción y ejecución de la inserción.
        const result = await supabase
            .from('reportes')
            .insert({
                folio: data.folio.trim(),
                departamento_id: data.departamento_id,
                problema_id: data.problema_id,
                descripcion: data.descripcion.trim(),
                nombre: data.nombre.trim(),
                telefono: data.telefono,
                correo: data.correo?.trim() || null,
                domicilio: data.domicilio.trim(),
                referencias: data.referencias?.trim() || null,
                foto_url: data.foto_url ?? null,
                fotoTipoID: data.fotoTipoID ?? null,
                mensajeAI: data.mensajeAI?.trim() || null,
                latitud: data.latitud || null,
                longitud: data.longitud || null,
            })

        return responder(res, result)

    } catch (error) {
        return responderErrorInterno(
            res,
            'Error interno al crear el reporte.',
            error
        )
    }
})


// (crearDetalleReporte)
// Endpoint público: no requiere autenticación ni autorización.
router.post('/detalleReporte', async (req, res) => {
    try {
        const data = req.body

        // Validación del objeto data.
        if (!esObjetoValido(data)) {
            return res.status(400).json({
                error: 'Datos de detalle de reporte no proporcionados o inválidos.'
            })
        }

        // Validación de folio.
        if (!esTextoValido(data.folio)) {
            return res.status(400).json({
                error: 'Folio no proporcionado o inválido.'
            })
        }

        // Validación de estado.
        if (!esIdValido(data.estado_id)) {
            return res.status(400).json({
                error: 'Estado ID inválido. Debe ser un número entero positivo.'
            })
        }

        // Construcción y ejecución de la inserción.
        const result = await supabase
            .from('detalle_reporte')
            .insert({
                folio: data.folio.trim(),
                estado_id: data.estado_id
            })

        return responder(res, result)

    } catch (error) {
        return responderErrorInterno(
            res,
            'Error interno al crear el detalle del reporte.',
            error
        )
    }
})


// (crearHistorialReporte)
router.post(
    '/historialReporte',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2, 3]),
    async (req, res) => {
        try {
            const { folio, data } = req.body

            // Validación de folio.
            if (!esTextoValido(folio)) {
                return res.status(400).json({
                    error: 'Folio no proporcionado o inválido.'
                })
            }

            // Validación del objeto data.
            if (!esObjetoValido(data)) {
                return res.status(400).json({
                    error: 'Datos del historial no proporcionados o inválidos.'
                })
            }

            // Validación de categoría.
            if (!esIdValido(data.categoria_historial_id)) {
                return res.status(400).json({
                    error: 'Categoría de historial inválida.'
                })
            }

            // Validación de título.
            if (!esIdValido(data.titulo_id)) {
                return res.status(400).json({
                    error: 'Título ID inválido.'
                })
            }

            // Validación de notas.
            if (!esTextoValido(data.notas)) {
                return res.status(400).json({
                    error: 'Notas no proporcionadas o inválidas.'
                })
            }

            // Construcción y ejecución de la inserción.
            const result = await supabase
                .from('historial_reporte')
                .insert({
                    folio: folio.trim(),
                    categoria_historial_id: data.categoria_historial_id,
                    titulo_id: data.titulo_id,
                    notas: data.notas.trim()
                })

            // Si todo es correcto, lo agregamos al historial del sistema
            const correoUsuario = obtenerUsuario(req)
            const accion = categoriaHistorialIDAAccion(data.categoria_historial_id)
            const detalle = categoriaHistorialIDADetalle(data.categoria_historial_id)
            await registrarHistorial(correoUsuario, {
                accion: accion,
                entidad: 'Reporte',
                detalles: `Se actualizó el historial del reporte con folio ${folio} a ${detalle}.`
            })

            return responder(res, result)

        } catch (error) {
            return responderErrorInterno(
                res,
                'Error interno al crear el historial del reporte.',
                error
            )
        }
    }
)


// (crearHistorialReporteConFoto)
router.post(
    '/historialReporteConFoto',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([3, 4]),
    async (req, res) => {
        try {
            const { folio, data } = req.body

            // Validación de folio.
            if (!esTextoValido(folio)) {
                return res.status(400).json({
                    error: 'Folio no proporcionado o inválido.'
                })
            }

            // Validación del objeto data.
            if (!esObjetoValido(data)) {
                return res.status(400).json({
                    error: 'Datos del historial no proporcionados o inválidos.'
                })
            }

            // Validación de categoría.
            if (!esIdValido(data.categoria_historial_id)) {
                return res.status(400).json({
                    error: 'Categoría de historial inválida.'
                })
            }

            // Validación de título.
            if (!esIdValido(data.titulo_id)) {
                return res.status(400).json({
                    error: 'Título ID inválido.'
                })
            }

            // Validación de notas.
            if (!esTextoValido(data.notas)) {
                return res.status(400).json({
                    error: 'Notas no proporcionadas o inválidas.'
                })
            }

            // Validación de foto URL.
            let fotoUrlValida = false

            if (esTextoValido(data.foto_url)) {
                try {
                    const url = new URL(data.foto_url)
                    fotoUrlValida = ['http:', 'https:'].includes(url.protocol)
                } catch {
                    fotoUrlValida = false
                }
            }

            if (!fotoUrlValida) {
                return res.status(400).json({
                    error: 'Foto URL no proporcionada o inválida.'
                })
            }

            // Construcción y ejecución de la inserción.
            const result = await supabase
                .from('historial_reporte')
                .insert({
                    folio: folio.trim(),
                    categoria_historial_id: data.categoria_historial_id,
                    titulo_id: data.titulo_id,
                    notas: data.notas.trim(),
                    foto_url: data.foto_url.trim()
                })

            // Si todo es correcto, lo agregamos al historial del sistema
            const correoUsuario = obtenerUsuario(req)
            const accion = categoriaHistorialIDAAccion(data.categoria_historial_id)
            const detalle = categoriaHistorialIDADetalle(data.categoria_historial_id)
            await registrarHistorial(correoUsuario, {
                accion: accion,
                entidad: 'Reporte',
                detalles: `Se actualizó el historial del reporte con folio ${folio} y fotografía a ${detalle}.`
            })

            return responder(res, result)

        } catch (error) {
            return responderErrorInterno(
                res,
                'Error interno al crear el historial del reporte con fotografía.',
                error
            )
        }
    }
)


// (crearProblemaInterno)
router.post(
    '/problema_interno',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { data } = req.body

            const {
                nombre,
                nombreamigable,
                departamento_id,
                estado
            } = data || {}

            // Validación del objeto data.
            if (!esObjetoValido(data)) {
                return res.status(400).json({
                    error: 'Datos del problema interno no proporcionados o inválidos.'
                })
            }

            // Validación de nombre.
            if (!esTextoValido(nombre)) {
                return res.status(400).json({
                    error: 'Nombre no proporcionado o inválido.'
                })
            }

            // Validación de nombre amigable.
            if (!esTextoValido(nombreamigable)) {
                return res.status(400).json({
                    error: 'Nombre amigable no proporcionado o inválido.'
                })
            }

            // Validación de departamento.
            if (!esIdValido(departamento_id)) {
                return res.status(400).json({
                    error: 'Departamento ID inválido.'
                })
            }

            // Validación de estado.
            if (estado !== 'Alta') {
                return res.status(400).json({
                    error: 'El estado inicial debe ser Alta.'
                })
            }

            // Construcción y ejecución de la inserción.
            const result = await supabase
                .from('problemas')
                .insert({
                    nombre: nombre.trim(),
                    nombreamigable: nombreamigable.trim(),
                    departamento_id,
                    estado
                })

            // Si todo es correcto, lo agregamos al historial del sistema
            const correoUsuario = obtenerUsuario(req)
            await registrarHistorial(correoUsuario, {
                accion: 'Crear',
                entidad: 'Problemática',
                detalles: `Se creó una nueva problemática interna: ${nombre}.`
            })

            return responder(res, result)

        } catch (error) {
            return responderErrorInterno(
                res,
                'Error interno al crear el problema interno.',
                error
            )
        }
    }
)


// (crearProblemaExterno)
router.post(
    '/problema_externo',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { data } = req.body

            const {
                nombre,
                nombreamigable,
                departamento_externo_id,
                estado
            } = data || {}

            // Validación del objeto data.
            if (!esObjetoValido(data)) {
                return res.status(400).json({
                    error: 'Datos del problema externo no proporcionados o inválidos.'
                })
            }

            // Validación de nombre.
            if (!esTextoValido(nombre)) {
                return res.status(400).json({
                    error: 'Nombre no proporcionado o inválido.'
                })
            }

            // Validación de nombre amigable.
            if (!esTextoValido(nombreamigable)) {
                return res.status(400).json({
                    error: 'Nombre amigable no proporcionado o inválido.'
                })
            }

            // Validación de departamento externo.
            if (!esIdValido(departamento_externo_id)) {
                return res.status(400).json({
                    error: 'Departamento externo ID inválido.'
                })
            }

            // Validación de estado.
            if (estado !== 'Alta') {
                return res.status(400).json({
                    error: 'El estado inicial debe ser Alta.'
                })
            }

            // Construcción y ejecución de la inserción.
            const result = await supabase
                .from('problemas_externos')
                .insert({
                    nombre: nombre.trim(),
                    nombreamigable: nombreamigable.trim(),
                    departamento_externo_id,
                    estado
                })

            // Si todo es correcto, lo agregamos al historial del sistema
            const correoUsuario = obtenerUsuario(req)
            await registrarHistorial(correoUsuario, {
                accion: 'Crear',
                entidad: 'Problemática',
                detalles: `Se creó una nueva problemática externa: ${nombre}.`
            })

            return responder(res, result)

        } catch (error) {
            return responderErrorInterno(
                res,
                'Error interno al crear el problema externo.',
                error
            )
        }
    }
)


// (crearDepartamentoInterno)
router.post(
    '/departamento_interno',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { data } = req.body

            const {
                nombre,
                nombreamigable,
                estado
            } = data || {}

            // Validación del objeto data.
            if (!esObjetoValido(data)) {
                return res.status(400).json({
                    error: 'Datos del departamento interno no proporcionados o inválidos.'
                })
            }

            // Validación de nombre.
            if (!esTextoValido(nombre)) {
                return res.status(400).json({
                    error: 'Nombre no proporcionado o inválido.'
                })
            }

            // Validación de nombre amigable.
            if (!esTextoValido(nombreamigable)) {
                return res.status(400).json({
                    error: 'Nombre amigable no proporcionado o inválido.'
                })
            }

            // Validación de estado.
            if (estado !== 'Alta') {
                return res.status(400).json({
                    error: 'El estado inicial debe ser Alta.'
                })
            }

            // Construcción y ejecución de la inserción.
            const result = await supabase
                .from('departamentos')
                .insert({
                    nombre: nombre.trim(),
                    nombreamigable: nombreamigable.trim(),
                    estado
                })

            // Si todo es correcto, lo agregamos al historial del sistema
            const correoUsuario = obtenerUsuario(req)
            await registrarHistorial(correoUsuario, {
                accion: 'Crear',
                entidad: 'Departamento',
                detalles: `Se creó un nuevo departamento interno: ${nombre}.`
            })

            return responder(res, result)

        } catch (error) {
            return responderErrorInterno(
                res,
                'Error interno al crear el departamento interno.',
                error
            )
        }
    }
)


// (crearDepartamentoExterno)
router.post(
    '/departamento_externo',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { data } = req.body

            const {
                departamento,
                estado
            } = data || {}

            // Validación del objeto data.
            if (!esObjetoValido(data)) {
                return res.status(400).json({
                    error: 'Datos del departamento externo no proporcionados o inválidos.'
                })
            }

            // Validación de departamento.
            if (!esTextoValido(departamento)) {
                return res.status(400).json({
                    error: 'Departamento no proporcionado o inválido.'
                })
            }

            // Validación de estado.
            if (estado !== 'Alta') {
                return res.status(400).json({
                    error: 'El estado inicial debe ser Alta.'
                })
            }

            // Construcción y ejecución de la inserción.
            const result = await supabase
                .from('departamentos_externos')
                .insert({
                    departamento: departamento.trim(),
                    estado
                })

            // Si todo es correcto, lo agregamos al historial del sistema
            const correoUsuario = obtenerUsuario(req)
            await registrarHistorial(correoUsuario, {
                accion: 'Crear',
                entidad: 'Departamento',
                detalles: `Se creó un nuevo departamento externo: ${departamento}.`
            })

            return responder(res, result)

        } catch (error) {
            return responderErrorInterno(
                res,
                'Error interno al crear el departamento externo.',
                error
            )
        }
    }
)

// (crearHistorial)
router.post(
    '/historial',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1, 2, 3, 4, 5, 6]),
    async (req, res) => {
        try {
            const { data } = req.body

            if (!esObjetoValido(data)) {
                return res.status(400).json({ error: 'Datos del historial no proporcionados o inválidos.' })
            }
            if (!esTextoValido(data.accion) || data.accion.trim().length > 100) {
                return res.status(400).json({ error: 'Acción no proporcionada o inválida.' })
            }
            if (!esTextoValido(data.entidad) || data.entidad.trim().length > 100) {
                return res.status(400).json({ error: 'Entidad no proporcionada o inválida.' })
            }
            if (data.detalles != null && (typeof data.detalles !== 'string' || data.detalles.length > 2000)) {
                return res.status(400).json({ error: 'Detalles inválidos.' })
            }

            // El responsable sale del token, nunca del frontend
            const responsable = req.user?.correo
            if (!esTextoValido(responsable)) {
                return res.status(400).json({ error: 'No se pudo identificar al responsable.' })
            }

            const result = await supabase.from('historial').insert({
                responsable,
                accion: data.accion.trim(),
                entidad: data.entidad.trim(),
                detalles: data.detalles ? data.detalles.trim() : null
            })

            return responder(res, result)
        } catch (error) {
            return responderErrorInterno(res, 'Error interno al crear el historial.', error)
        }
    }
)

export default router