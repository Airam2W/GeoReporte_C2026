import { Router } from 'express'
import { supabase } from '../config/supabase.js'
import { responder } from '../helpers/response.js'
import jwt from 'jsonwebtoken'
import {
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion
} from '../middleware/auth.js'

const router = Router()


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

// -----------------------------------------
// ENDPOINTS PÚBLICOS
// -----------------------------------------

// (obtenerDepartamentosOrdenadosPorId)
router.get('/departamentos/ordenadosPorId', manejarErrores(async (req, res) => {
    const result = await supabase
        .from('departamentos')
        .select('id, nombre, nombreamigable, estado')
        .order('id', { ascending: true })

    responder(res, result)
}))


// (obtenerReportePorFolio)
router.get('/reportes/folio', manejarErrores(async (req, res) => {
    const { valor } = req.query

    if (typeof valor !== 'string' || !valor.trim()) {
        return res.status(400).json({
            data: null,
            error: { message: 'Folio no proporcionado o inválido.' }
        })
    }

    const result = await supabase
        .from('reportes')
        .select([
            'folio',
            'descripcion',
            'nombre',
            'telefono',
            'domicilio',
            'referencias',
            'foto_url',
            'created_at',
            'problemas (nombreamigable)',
            'departamentos (id, nombre, nombreamigable)',
            'departamentos_externos (id, departamento)',
            'detalle_reporte ( estado_id, estadoreporte (estado) )',
            'historial_reporte(categoria_historial_id,notas,fecha,foto_url,titulo(nombre))'
        ].join(','))
        .eq('folio', valor.trim())
        .maybeSingle()

    if (result.error) {
        return responder(res, result)
    }

    if (!result.data) {
        return res.status(404).json({
            data: null,
            error: { message: 'El reporte que estás buscando no existe.' }
        })
    }

    responder(res, result)
}))


// (obtenerSupervisorIDPorUsuarioID)
router.get('/supervisores/usuarioID', manejarErrores(async (req, res) => {
    const { valor } = req.query

    if (typeof valor !== 'string' || !valor.trim()) {
        return res.status(400).json({
            data: null,
            error: { message: 'Valor de búsqueda no proporcionado o inválido.' }
        })
    }

    const result = await supabase
        .from('supervisores')
        .select('id, departamento_id')
        .eq('usuario_id', valor)

    responder(res, result)
}))


// (obtenerJefeIDPorUsuarioID)
router.get('/jefes/usuarioID', manejarErrores(async (req, res) => {
    const { valor } = req.query

    if (typeof valor !== 'string' || !valor.trim()) {
        return res.status(400).json({
            data: null,
            error: { message: 'Valor de búsqueda no proporcionado o inválido.' }
        })
    }

    const result = await supabase
        .from('jefes')
        .select('id, supervisor_id, supervisores(departamento_id)')
        .eq('usuario_id', valor)

    responder(res, result)
}))


// (obtenerProblemasPorDepartamentoID)
router.get('/problemas/departamentoId', manejarErrores(async (req, res) => {
    const { valor } = req.query

    if (typeof valor !== 'string' || !valor.trim()) {
        return res.status(400).json({
            data: null,
            error: { message: 'Valor de búsqueda no proporcionado o inválido.' }
        })
    }

    const existingResult = await supabase
        .from('departamentos')
        .select('id')
        .eq('id', valor)
        .maybeSingle()

    if (existingResult.error) {
        return responder(res, existingResult)
    }

    if (!existingResult.data) {
        return res.status(404).json({
            data: null,
            error: { message: 'El departamento que estás buscando no existe en la base de datos.' }
        })
    }

    const result = await supabase
        .from('problemas')
        .select('id, nombre, nombreamigable, departamento_id, estado')
        .eq('departamento_id', valor)
        .order('id', { ascending: true })

    responder(res, result)
}))


// -----------------------------------------
// ENDPOINTS PROTEGIDOS
// -----------------------------------------

// (obtenerTodosDepartamentosInternos)
router.get(
    '/departamentos_internos',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1, 2, 3]),
    manejarErrores(async (req, res) => {
        const result = await supabase
            .from('departamentos')
            .select('id, nombre, nombreamigable, estado')
            .order('nombre', { ascending: true })

        responder(res, result)
    })
)


// (obtenerTodosDepartamentosExternos)
router.get(
    '/departamentos_externos',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1, 2]),
    manejarErrores(async (req, res) => {
        const result = await supabase
            .from('departamentos_externos')
            .select('id, departamento, estado')
            .order('departamento', { ascending: true })

        responder(res, result)
    })
)


// (obtenerTodosProblemasInternos)
router.get(
    '/problemas_internos',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    manejarErrores(async (req, res) => {
        const result = await supabase
            .from('problemas')
            .select('id, nombre, nombreamigable, departamento_id, departamentos (id, nombre), estado')
            .order('nombre', { ascending: true })

        responder(res, result)
    })
)


// (obtenerTodosProblemasExternos)
router.get(
    '/problemas_externos',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    manejarErrores(async (req, res) => {
        const result = await supabase
            .from('problemas_externos')
            .select('id, nombre, nombreamigable, departamento_externo_id, departamentos_externos (id, departamento), estado')
            .order('nombre', { ascending: true })

        responder(res, result)
    })
)


// (obtenerTodosSupervisores)
router.get(
    '/supervisores',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    manejarErrores(async (req, res) => {
        const result = await supabase
            .from('supervisores')
            .select('id, usuario_id, usuarios(id, nombre, apellido_p, apellido_m)')

        responder(res, result)
    })
)


// (obtenerTodosJefes)
router.get(
    '/jefes',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1, 2]),
    manejarErrores(async (req, res) => {
        const result = await supabase
            .from('jefes')
            .select('id, supervisor_id, usuario_id, usuarios(id, nombre, apellido_p, apellido_m)')

        responder(res, result)
    })
)


// (obtenerUsuarioExcepto)
router.get(
    '/usuarios/excepto',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'Valor de búsqueda no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('tipousuario')
            .select('id, nombre')
            .neq('id', valor)

        responder(res, result)
    })
)


// (obtenerTodosUsuariosExcepto)
router.get(
    '/usuariosTodos/excepto',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'Valor de búsqueda no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('usuarios')
            .select([
                'id',
                'correo',
                'nombre',
                'apellido_p',
                'apellido_m',
                'estadoadministrativo',
                'tipousuario_id',
                'fechaalta',
                'fechabaja',
                'tipousuario:tipousuario_id (nombre)',
                'administradores (created_at, departamentos(id, nombre))',
                'supervisores (created_at, departamentos(id, nombre), usuarios(id, nombre, apellido_p, apellido_m), jefes(id, usuarios(id, nombre, apellido_p, apellido_m)))',
                'jefes (created_at, supervisores(id, usuarios(id, nombre, apellido_p, apellido_m)), trabajadores(id, usuarios(id, nombre, apellido_p, apellido_m)))',
                'trabajadores (created_at, jefes(id, usuarios(id, nombre, apellido_p, apellido_m), supervisores(id, usuarios(id, nombre, apellido_p, apellido_m))) )',
                'personal_externo (created_at, departamentos_externos(id, departamento))'
            ].join(','))
            .neq('tipousuario_id', valor)
            .order('nombre', { ascending: true })

        responder(res, result)
    })
)


// (obtenerDepartamentosInternosPorNombre)
router.get(
    '/departamentos_internos/nombre',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'Escribe un nombre de departamento válido.' }
            })
        }

        const result = await supabase
            .from('departamentos')
            .select('id, nombre')
            .ilike('nombre', valor.trim())

        responder(res, result)
    })
)


// (obtenerDepartamentosExternosPorNombre)
router.get(
    '/departamentos_externos/nombre',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'Escribe un nombre de departamento válido.' }
            })
        }

        const result = await supabase
            .from('departamentos_externos')
            .select('id, departamento')
            .ilike('departamento', valor.trim())

        responder(res, result)
    })
)


// (obtenerProblematicasInternasPorNombre)
router.get(
    '/problematicas_internas/nombre',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'Escribe un nombre de problema válido.' }
            })
        }

        const result = await supabase
            .from('problemas')
            .select('id, nombre')
            .ilike('nombre', valor.trim())

        responder(res, result)
    })
)


// (obtenerProblematicasExternasPorNombre)
router.get(
    '/problematicas_externas/nombre',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'Escribe un nombre de problema válido.' }
            })
        }

        const result = await supabase
            .from('problemas_externos')
            .select('id, nombre')
            .ilike('nombre', valor.trim())

        responder(res, result)
    })
)


// (obtenerCorreoUnico)
router.get(
    '/usuarios/correoUnico',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    manejarErrores(async (req, res) => {
        const { valor, id } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'Correo no proporcionado o inválido.' }
            })
        }

        const correo = valor.trim().toLowerCase()
        const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!correoRegex.test(correo)) {
            return res.status(400).json({
                data: null,
                error: { message: 'El formato del correo es inválido.' }
            })
        }

        const existingResult = await supabase
            .from('usuarios')
            .select('id')
            .eq('correo', correo)

        if (existingResult.error) {
            return responder(res, existingResult)
        }

        if (existingResult.data && existingResult.data.length > 0) {
            // Validar que si el correo ya existe pero pertenece exactamente al mismo usuario (por id), no se considere duplicado.
            const esMismoUsuario = id &&
                existingResult.data.some(usuario => String(usuario.id) === String(id))

            if (!esMismoUsuario) {
                return res.status(400).json({
                    data: null,
                    error: { message: 'El correo que estás ingresando ya existe.' }
                })
            }
        }

        const result = await supabase
            .from('usuarios')
            .select('id, nombre, apellido_p, apellido_m, correo, estadoadministrativo, tipousuario_id, fechaalta, fechabaja')
            .eq('correo', correo)
            .maybeSingle()

        responder(res, result)
    })
)


// (obtenerEstadoIDPorNombre)
router.get(
    '/estadoId/nombre',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2, 3]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'Nombre de estado no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('estadoreporte')
            .select('id')
            .eq('estado', valor.trim())
            .maybeSingle()

        responder(res, result)
    })
)


// (obtenerProblematicasInternasPorID)
router.get(
    '/problematicas_internas/id',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'ID de departamento no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('problemas')
            .select('id, nombre, estado')
            .eq('departamento_id', valor)

        responder(res, result)
    })
)


// (obtenerProblematicasExternasPorID)
router.get(
    '/problematicas_externas/id',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2, 6]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'ID de departamento externo no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('problemas_externos')
            .select('id, nombre, estado, nombreamigable, departamento_externo_id')
            .eq('departamento_externo_id', valor)

        responder(res, result)
    })
)


// (obtenerDepartamentosExternosPorID)
router.get(
    '/departamentos_externos/id',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2, 6]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'ID de departamento externo no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('departamentos_externos')
            .select('id, departamento')
            .eq('id', valor)

        responder(res, result)
    })
)


// (obtenerDepartamentosInternosPorID)
router.get(
    '/departamentos_internos/id',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2, 3, 4]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'ID de departamento interno no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('departamentos')
            .select('id, nombre')
            .eq('id', valor)

        responder(res, result)
    })
)


// (obtenerAdministradoresInternosPorID)
router.get(
    '/administradores_internos/id',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'ID de departamento no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('administradores')
            .select('id, usuario_id, usuarios(nombre, apellido_p, apellido_m, estadoadministrativo)')
            .eq('departamento_id', valor)

        responder(res, result)
    })
)


// (obtenerAdministradoresExternosPorID)
router.get(
    '/administradores_externos/id',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'ID de departamento externo no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('personal_externo')
            .select('id, usuario_id, usuarios(nombre, apellido_p, apellido_m, estadoadministrativo)')
            .eq('dep_externo_id', valor)

        responder(res, result)
    })
)


// (obtenerSupervisoresPorDepartamentoID)
router.get(
    '/supervisores/departamentoId',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'ID de departamento no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('supervisores')
            .select('id, usuario_id, usuarios(nombre, apellido_p, apellido_m, estadoadministrativo)')
            .eq('departamento_id', valor)

        responder(res, result)
    })
)


// (obtenerTitulos)
router.get(
    '/titulos/categoria_historial_id',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2, 3, 4]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'ID de categoría de historial no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('titulo')
            .select('id, nombre')
            .eq('categoria_historial_id', valor)

        responder(res, result)
    })
)


// (obtenerCategoriaHistorial)
router.get(
    '/categoria_historial/id',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([3]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'ID de categoría de historial no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('categoria_historial')
            .select('id, nombre')
            .eq('id', valor)

        responder(res, result)
    })
)


// (obtenerReportesPorDepartamentoExternoID)
router.get(
    '/reportes/departamento_externo_Id',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([6]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'ID de departamento externo no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('reportes')
            .select([
                'folio',
                'descripcion',
                'nombre',
                'telefono',
                'domicilio',
                'referencias',
                'foto_url',
                'created_at',
                'problemas_externos (id, nombre, nombreamigable)',
                'departamentos_externos (id, departamento)',
                'detalle_reporte (estado_id, estadoreporte (estado), updated_at)',
                'historial_reporte(categoria_historial_id,notas,fecha,foto_url,titulo(nombre))'
            ].join(','))
            .eq('departamento_externo_id', valor)
            .order('created_at', { ascending: false })

        responder(res, result)
    })
)


// (obtenerReportesPorDepartamentoInternoID)
router.get(
    '/reportes/departamento_interno_Id',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'ID de departamento interno no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('reportes')
            .select([
                'folio',
                'descripcion',
                'nombre',
                'telefono',
                'domicilio',
                'referencias',
                'foto_url',
                'mensajeAI',
                'fotoTipoID',
                'created_at',
                'problemas (id, nombre, nombreamigable)',
                'departamentos (id, nombre, nombreamigable)',
                'detalle_reporte(estado_id,fecha_inicio,fecha_cierre,estadoreporte(estado),jefe_id,supervisor_id,supervisores(usuario_id,usuarios(nombre,apellido_p,apellido_m)),jefes(usuario_id,usuarios(nombre,apellido_p,apellido_m)))',
                'historial_reporte(categoria_historial_id,notas,fecha,foto_url,titulo(nombre))'
            ].join(','))
            .eq('departamento_id', valor)
            .order('created_at', { ascending: false })

        responder(res, result)
    })
)


// (obtenerReportesJefe)
router.get(
    '/reportes/jefe',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([4]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'ID de departamento no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('reportes')
            .select([
                'folio',
                'descripcion',
                'domicilio',
                'referencias',
                'foto_url',
                'created_at',
                'problemas(id,nombre, nombreamigable)',
                'departamentos(id,nombre, nombreamigable)',
                'detalle_reporte(estado_id,fecha_inicio,fecha_cierre,estadoreporte(estado),jefe_id,supervisor_id,supervisores(usuario_id,usuarios(nombre,apellido_p,apellido_m)))',
                'historial_reporte(categoria_historial_id,notas,fecha,foto_url,titulo(nombre))'
            ].join(','))
            .eq('departamento_id', valor)
            .order('created_at', { ascending: false })

        responder(res, result)
    })
)


// (obtenerReportesSupervisor)
router.get(
    '/reportes/supervisor',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([3]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'ID de departamento no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('reportes')
            .select([
                'folio',
                'descripcion',
                'domicilio',
                'referencias',
                'mensajeAI',
                'fotoTipoID',
                'fotoDepartamentoID',
                'foto_url',
                'created_at',
                'problemas(id,nombre, nombreamigable)',
                'departamentos(id,nombre, nombreamigable)',
                'detalle_reporte(estado_id,fecha_inicio,fecha_cierre,estadoreporte(estado),jefe_id,supervisor_id,supervisores(usuario_id,usuarios(nombre,apellido_p,apellido_m)), jefes(usuario_id,usuarios(nombre,apellido_p,apellido_m)))',
                'historial_reporte(categoria_historial_id,notas,fecha,foto_url,titulo(nombre))'
            ].join(','))
            .eq('departamento_id', valor)
            .order('created_at', { ascending: false })

        responder(res, result)
    })
)


// (obtenerJefesPorSupervisor)
router.get(
    '/jefes/supervisorId',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([3]),
    manejarErrores(async (req, res) => {
        const { valor } = req.query

        if (typeof valor !== 'string' || !valor.trim()) {
            return res.status(400).json({
                data: null,
                error: { message: 'ID de supervisor no proporcionado o inválido.' }
            })
        }

        const result = await supabase
            .from('jefes')
            .select('id, usuario_id, usuarios(nombre, apellido_p, apellido_m, estadoadministrativo)')
            .eq('supervisor_id', valor)

        responder(res, result)
    })
)

// (obtenerHistorial)
router.get(
    '/historial',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const pagina = Math.max(1, parseInt(req.query.pagina) || 1)
            const limite = Math.min(100, Math.max(1, parseInt(req.query.limite) || 25))
            const desde = (pagina - 1) * limite
            const hasta = desde + limite - 1

            const { accion, entidad, busqueda, fechaDesde, fechaHasta } = req.query

            let query = supabase
                .from('historial')
                .select('*', { count: 'exact' })
                .order('fecha', { ascending: false })
                .order('id', { ascending: false })
                .range(desde, hasta)

            if (esTextoValido(accion)) query = query.eq('accion', accion.trim())
            if (esTextoValido(entidad)) query = query.eq('entidad', entidad.trim())

            if (esTextoValido(fechaDesde)) {
                if (Number.isNaN(Date.parse(fechaDesde))) {
                    return res.status(400).json({ error: 'Fecha inicial inválida.' })
                }
                query = query.gte('fecha', fechaDesde)
            }

            if (esTextoValido(fechaHasta)) {
                if (Number.isNaN(Date.parse(fechaHasta))) {
                    return res.status(400).json({ error: 'Fecha final inválida.' })
                }
                query = query.lte('fecha', fechaHasta)
            }

            if (esTextoValido(busqueda)) {
                // Se quitan caracteres que rompen la sintaxis del filtro .or()
                const termino = busqueda.trim().slice(0, 100).replace(/[,()%*\\]/g, ' ')
                query = query.or(`responsable.ilike.%${termino}%,detalles.ilike.%${termino}%`)
            }

            const { data, error, count } = await query

            if (error) return responder(res, { data: null, error })

            return res.status(200).json({
                data: { registros: data, total: count ?? 0 },
                error: null
            })
        } catch (error) {
            return responderErrorInterno(res, 'Error interno al obtener el historial.', error)
        }
    }
)

export default router