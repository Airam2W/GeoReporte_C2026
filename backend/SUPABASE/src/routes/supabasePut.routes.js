
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

// ----------------------------------------- FUNCIONES AUXILIARES -----------------------------------------

// Validar identificadores numéricos o de texto
function validarId(id) {
    if (typeof id === 'number') {
        return Number.isSafeInteger(id) && id > 0
    }

    if (typeof id === 'string') {
        return id.trim().length > 0
    }

    return false
}

// Validar fechas
function validarFecha(fecha) {
    return (
        typeof fecha === 'string' &&
        fecha.trim() !== '' &&
        !isNaN(Date.parse(fecha))
    )
}

// ----------------------------------------- ENDPOINTS -----------------------------------------

// (actualizarEstadoReporte)
router.put(
    '/reporte/estadoId',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2, 3, 4, 6]),
    async (req, res) => {
        try {
            const { folio, data } = req.body
            const { estado_id } = data || {}

            // Validar folio
            if (typeof folio !== 'string' || !folio.trim()) {
                return res.status(400).json({
                    error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
                })
            }

            // Validar estado_id
            if (!Number.isSafeInteger(estado_id) || estado_id <= 0) {
                return res.status(400).json({
                    error: 'Estado no proporcionado o tipo inválido. Por favor, ingresa un estado válido.'
                })
            }

            const result = await supabase
                .from('detalle_reporte')
                .update({ estado_id })
                .eq('folio', folio)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el reporte solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar el estado del reporte:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el estado del reporte.'
            })
        }
    }
)

// (actualizarEstadoReporteConJefeFechaInicio)
router.put(
    '/reporte/estadoIdJefeFechaInicio',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([3]),
    async (req, res) => {
        try {
            const { folio, data } = req.body
            const { jefe_id, estado_id, fecha_inicio } = data || {}

            if (typeof folio !== 'string' || !folio.trim()) {
                return res.status(400).json({
                    error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
                })
            }

            if (!Number.isSafeInteger(jefe_id) || jefe_id <= 0) {
                return res.status(400).json({
                    error: 'Jefe no proporcionado o tipo inválido. Por favor, ingresa un jefe válido.'
                })
            }

            if (!Number.isSafeInteger(estado_id) || estado_id <= 0) {
                return res.status(400).json({
                    error: 'Estado no proporcionado o tipo inválido. Por favor, ingresa un estado válido.'
                })
            }

            if (!validarFecha(fecha_inicio)) {
                return res.status(400).json({
                    error: 'Fecha de inicio no proporcionada o formato incorrecto. Por favor, ingresa una fecha válida.'
                })
            }

            const result = await supabase
                .from('detalle_reporte')
                .update({ jefe_id, estado_id, fecha_inicio })
                .eq('folio', folio)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el reporte solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar el reporte con jefe y fecha de inicio:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el reporte.'
            })
        }
    }
)

// (actualizarEstadoReporteConFechaCierre)
router.put(
    '/reporte/estadoIdFechaCierre',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([3]),
    async (req, res) => {
        try {
            const { folio, data } = req.body
            const { estado_id, fecha_cierre } = data || {}

            if (typeof folio !== 'string' || !folio.trim()) {
                return res.status(400).json({
                    error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
                })
            }

            if (!Number.isSafeInteger(estado_id) || estado_id <= 0) {
                return res.status(400).json({
                    error: 'Estado no proporcionado o tipo inválido. Por favor, ingresa un estado válido.'
                })
            }

            if (!validarFecha(fecha_cierre)) {
                return res.status(400).json({
                    error: 'Fecha de cierre no proporcionada o formato incorrecto. Por favor, ingresa una fecha válida.'
                })
            }

            const result = await supabase
                .from('detalle_reporte')
                .update({ estado_id, fecha_cierre })
                .eq('folio', folio)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el reporte solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar la fecha de cierre del reporte:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar la fecha de cierre.'
            })
        }
    }
)

// (actualizarEstadoReporteQuitarSupervisor)
router.put(
    '/reporte/estadoIdSupervisorNull',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([3]),
    async (req, res) => {
        try {
            const { folio, data } = req.body
            const { estado_id } = data || {}

            if (typeof folio !== 'string' || !folio.trim()) {
                return res.status(400).json({
                    error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
                })
            }

            if (!Number.isSafeInteger(estado_id) || estado_id <= 0) {
                return res.status(400).json({
                    error: 'Estado no proporcionado o tipo inválido. Por favor, ingresa un estado válido.'
                })
            }

            const result = await supabase
                .from('detalle_reporte')
                .update({ estado_id, supervisor_id: null })
                .eq('folio', folio)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el reporte solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al quitar el supervisor del reporte:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el reporte.'
            })
        }
    }
)

// (actualizarEstadoProblemaInterno)
router.put(
    '/problema_interno/estado',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { data } = req.body
            const { estado, id } = data || {}

            if (!validarId(id)) {
                return res.status(400).json({
                    error: 'ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
                })
            }

            if (estado !== 'Alta' && estado !== 'Baja') {
                return res.status(400).json({
                    error: 'Estado no válido. Ingresa Alta o Baja.'
                })
            }

            const result = await supabase
                .from('problemas')
                .update({ estado })
                .eq('id', id)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el problema interno solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar el estado del problema interno:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el problema interno.'
            })
        }
    }
)

// (actualizarEstadoProblemaExterno)
router.put(
    '/problema_externo/estado',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { data } = req.body
            const { estado, id } = data || {}

            if (!validarId(id)) {
                return res.status(400).json({
                    error: 'ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
                })
            }

            if (estado !== 'Alta' && estado !== 'Baja') {
                return res.status(400).json({
                    error: 'Estado no válido. Ingresa Alta o Baja.'
                })
            }

            const result = await supabase
                .from('problemas_externos')
                .update({ estado })
                .eq('id', id)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el problema externo solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar el estado del problema externo:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el problema externo.'
            })
        }
    }
)

// (actualizarSupervisorEstadoReporte)
router.put(
    '/reporteEstado/supervisor',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2, 3]),
    async (req, res) => {
        try {
            const { folio, data } = req.body
            const { estado_id, supervisor_id } = data || {}

            if (typeof folio !== 'string' || !folio.trim()) {
                return res.status(400).json({
                    error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
                })
            }

            if (!Number.isSafeInteger(estado_id) || estado_id <= 0) {
                return res.status(400).json({
                    error: 'Estado no proporcionado o tipo inválido. Por favor, ingresa un estado válido.'
                })
            }

            if (!Number.isSafeInteger(supervisor_id) || supervisor_id <= 0) {
                return res.status(400).json({
                    error: 'Supervisor ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
                })
            }

            const result = await supabase
                .from('detalle_reporte')
                .update({ estado_id, supervisor_id })
                .eq('folio', folio)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el reporte solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar el supervisor del reporte:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el supervisor del reporte.'
            })
        }
    }
)

// (actualizarReporteADepartamentoInterno)
router.put(
    '/reporte/departamento_interno',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2]),
    async (req, res) => {
        try {
            const { folio, departamento_id, problema_id } = req.body

            const departamento_externo_id = null
            const problema_externo_id = null

            if (typeof folio !== 'string' || !folio.trim()) {
                return res.status(400).json({
                    error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
                })
            }

            if (!Number.isSafeInteger(departamento_id) || departamento_id <= 0) {
                return res.status(400).json({
                    error: 'Departamento ID no proporcionado o tipo inválido.'
                })
            }

            if (!Number.isSafeInteger(problema_id) || problema_id <= 0) {
                return res.status(400).json({
                    error: 'Problema ID no proporcionado o tipo inválido.'
                })
            }

            const result = await supabase
                .from('reportes')
                .update({
                    departamento_id,
                    problema_id,
                    departamento_externo_id,
                    problema_externo_id
                })
                .eq('folio', folio)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el reporte solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al cambiar el reporte a departamento interno:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el departamento del reporte.'
            })
        }
    }
)

// (actualizarReporteADepartamentoExterno)
router.put(
    '/reporte/departamento_externo',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([2, 6]),
    async (req, res) => {
        try {
            const {
                folio,
                departamento_id: departamento_externo_id,
                problema_id: problema_externo_id
            } = req.body

            const departamento_id = null
            const problema_id = null

            if (typeof folio !== 'string' || !folio.trim()) {
                return res.status(400).json({
                    error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
                })
            }

            if (!Number.isSafeInteger(departamento_externo_id) || departamento_externo_id <= 0) {
                return res.status(400).json({
                    error: 'Departamento Externo ID no proporcionado o tipo inválido.'
                })
            }

            if (!Number.isSafeInteger(problema_externo_id) || problema_externo_id <= 0) {
                return res.status(400).json({
                    error: 'Problema Externo ID no proporcionado o tipo inválido.'
                })
            }

            const result = await supabase
                .from('reportes')
                .update({
                    departamento_externo_id,
                    problema_externo_id,
                    departamento_id,
                    problema_id
                })
                .eq('folio', folio)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el reporte solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al cambiar el reporte a departamento externo:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el departamento del reporte.'
            })
        }
    }
)

// (actualizarProblemaInterno)
router.put(
    '/problema_interno',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { id, data } = req.body
            const { nombre, nombreamigable, departamento_id } = data || {}

            if (!validarId(id)) {
                return res.status(400).json({
                    error: 'ID no proporcionado o tipo inválido.'
                })
            }

            if (typeof nombre !== 'string' || !nombre.trim()) {
                return res.status(400).json({
                    error: 'Nombre no proporcionado o tipo inválido.'
                })
            }

            if (typeof nombreamigable !== 'string' || !nombreamigable.trim()) {
                return res.status(400).json({
                    error: 'Nombre amigable no proporcionado o tipo inválido.'
                })
            }

            if (!Number.isSafeInteger(departamento_id) || departamento_id <= 0) {
                return res.status(400).json({
                    error: 'Departamento ID no proporcionado o tipo inválido.'
                })
            }

            const result = await supabase
                .from('problemas')
                .update({ nombre, nombreamigable, departamento_id })
                .eq('id', id)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el problema interno solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar el problema interno:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el problema interno.'
            })
        }
    }
)

// (actualizarProblemaExterno)
router.put(
    '/problema_externo',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { id, data } = req.body
            const { nombre, nombreamigable, departamento_externo_id } = data || {}

            if (!validarId(id)) {
                return res.status(400).json({
                    error: 'ID no proporcionado o tipo inválido.'
                })
            }

            if (typeof nombre !== 'string' || !nombre.trim()) {
                return res.status(400).json({
                    error: 'Nombre no proporcionado o tipo inválido.'
                })
            }

            if (typeof nombreamigable !== 'string' || !nombreamigable.trim()) {
                return res.status(400).json({
                    error: 'Nombre amigable no proporcionado o tipo inválido.'
                })
            }

            if (!Number.isSafeInteger(departamento_externo_id) || departamento_externo_id <= 0) {
                return res.status(400).json({
                    error: 'Departamento Externo ID no proporcionado o tipo inválido.'
                })
            }

            const result = await supabase
                .from('problemas_externos')
                .update({ nombre, nombreamigable, departamento_externo_id })
                .eq('id', id)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el problema externo solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar el problema externo:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el problema externo.'
            })
        }
    }
)

// (actualizarDepartamentoInterno)
router.put(
    '/departamento_interno',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { id, data } = req.body
            const { nombre, nombreamigable } = data || {}

            if (!validarId(id)) {
                return res.status(400).json({
                    error: 'ID no proporcionado o tipo inválido.'
                })
            }

            if (typeof nombre !== 'string' || !nombre.trim()) {
                return res.status(400).json({
                    error: 'Nombre no proporcionado o tipo inválido.'
                })
            }

            if (typeof nombreamigable !== 'string' || !nombreamigable.trim()) {
                return res.status(400).json({
                    error: 'Nombre amigable no proporcionado o tipo inválido.'
                })
            }

            const result = await supabase
                .from('departamentos')
                .update({ nombre, nombreamigable })
                .eq('id', id)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el departamento interno solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar el departamento interno:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el departamento interno.'
            })
        }
    }
)

// (actualizarDepartamentoExterno)
router.put(
    '/departamento_externo',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { id, data } = req.body
            const { departamento } = data || {}

            if (!validarId(id)) {
                return res.status(400).json({
                    error: 'ID no proporcionado o tipo inválido.'
                })
            }

            if (typeof departamento !== 'string' || !departamento.trim()) {
                return res.status(400).json({
                    error: 'Departamento no proporcionado o tipo inválido.'
                })
            }

            const result = await supabase
                .from('departamentos_externos')
                .update({ departamento })
                .eq('id', id)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el departamento externo solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar el departamento externo:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el departamento externo.'
            })
        }
    }
)

// (actualizarEstadoDepartamentoInterno)
router.put(
    '/departamento_interno/estado',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { id, data } = req.body
            const { estado } = data || {}

            if (!validarId(id)) {
                return res.status(400).json({
                    error: 'ID no proporcionado o tipo inválido.'
                })
            }

            if (estado !== 'Alta' && estado !== 'Baja') {
                return res.status(400).json({
                    error: 'Estado no válido. Ingresa Alta o Baja.'
                })
            }

            const result = await supabase
                .from('departamentos')
                .update({ estado })
                .eq('id', id)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el departamento interno solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar el estado del departamento interno:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el departamento interno.'
            })
        }
    }
)

// (actualizarEstadoDepartamentoExterno)
router.put(
    '/departamento_externo/estado',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { id, data } = req.body
            const { estado } = data || {}

            if (!validarId(id)) {
                return res.status(400).json({
                    error: 'ID no proporcionado o tipo inválido.'
                })
            }

            if (estado !== 'Alta' && estado !== 'Baja') {
                return res.status(400).json({
                    error: 'Estado no válido. Ingresa Alta o Baja.'
                })
            }

            const result = await supabase
                .from('departamentos_externos')
                .update({ estado })
                .eq('id', id)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el departamento externo solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar el estado del departamento externo:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el departamento externo.'
            })
        }
    }
)

// (actualizarEstadoUsuario)
router.put(
    '/usuario/estado',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { id, data } = req.body
            const { estadoadministrativo } = data || {}

            if (!validarId(id)) {
                return res.status(400).json({
                    error: 'ID no proporcionado o tipo inválido.'
                })
            }

            if (estadoadministrativo !== 'Alta' && estadoadministrativo !== 'Baja') {
                return res.status(400).json({
                    error: 'Estado administrativo no válido. Ingresa Alta o Baja.'
                })
            }

            const result = await supabase
                .from('usuarios')
                .update({ estadoadministrativo })
                .eq('id', id)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el usuario solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar el estado del usuario:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar el estado del usuario.'
            })
        }
    }
)

// (actualizarFechaBajaUsuario)
router.put(
    '/usuario/fechaBaja',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { id, data } = req.body
            const { fechabaja } = data || {}

            if (!validarId(id)) {
                return res.status(400).json({
                    error: 'ID no proporcionado o tipo inválido.'
                })
            }

            if (!validarFecha(fechabaja)) {
                return res.status(400).json({
                    error: 'Fecha de baja no proporcionada o tipo inválido. Ingresa una fecha válida.'
                })
            }

            const result = await supabase
                .from('usuarios')
                .update({ fechabaja })
                .eq('id', id)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el usuario solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar la fecha de baja del usuario:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar la fecha de baja.'
            })
        }
    }
)

// (actualizarFechaAltaUsuario)
router.put(
    '/usuario/fechaAlta',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { id, data } = req.body
            const { fechaalta } = data || {}

            if (!validarId(id)) {
                return res.status(400).json({
                    error: 'ID no proporcionado o tipo inválido.'
                })
            }

            if (!validarFecha(fechaalta)) {
                return res.status(400).json({
                    error: 'Fecha de alta no proporcionada o tipo inválido. Ingresa una fecha válida.'
                })
            }

            const result = await supabase
                .from('usuarios')
                .update({ fechaalta })
                .eq('id', id)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el usuario solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar la fecha de alta del usuario:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar la fecha de alta.'
            })
        }
    }
)

// (actualizarFotoDepartamentoReporte)
router.put(
    '/reporte/fotoDepartamentoID',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([3]),
    async (req, res) => {
        try {
            const { folio, fotoDepartamentoID } = req.body

            if (
                (typeof folio !== 'string' && typeof folio !== 'number') ||
                String(folio).trim() === ''
            ) {
                return res.status(400).json({
                    error: 'Folio no proporcionado o tipo inválido. Por favor, ingresa un folio válido.'
                })
            }

            if (
                (typeof fotoDepartamentoID !== 'string' && typeof fotoDepartamentoID !== 'number') ||
                String(fotoDepartamentoID).trim() === ''
            ) {
                return res.status(400).json({
                    error: 'Foto Departamento ID no proporcionado o tipo inválido. Por favor, ingresa un ID válido.'
                })
            }

            const result = await supabase
                .from('reportes')
                .update({ fotoDepartamentoID })
                .eq('folio', folio)
                .select()
                .maybeSingle()

            if (result.error) {
                return responder(res, result)
            }

            if (!result.data) {
                return res.status(404).json({
                    error: 'No se encontró el reporte solicitado.'
                })
            }

            responder(res, result)
        } catch (error) {
            console.error('Error al actualizar la foto del departamento del reporte:', error)
            return res.status(500).json({
                error: 'Error interno al actualizar la foto del departamento.'
            })
        }
    }
)

export default router
