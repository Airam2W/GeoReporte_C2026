
import { Router } from 'express'
import { supabase } from '../config/supabase.js'
import { responder } from '../helpers/response.js'
import jwt from 'jsonwebtoken'
import { registrarHistorial } from '../utils/registrarHistorial.js'

import {
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion
} from '../middleware/auth.js'

const router = Router()

// ==========================================
// Validación de ID
// ==========================================
const validarId = (id) => {
    if (
        id === undefined ||
        id === null ||
        (typeof id !== 'number' && typeof id !== 'string')
    ) {
        return false
    }

    const idNumerico = Number(id)

    return Number.isSafeInteger(idNumerico) && idNumerico > 0
}

// ==========================================
// DELETE: Problema interno
// Tabla: problemas
// Rol permitido: Director General [1]
// ==========================================
router.delete(
    '/problema_interno',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { id } = req.body

            if (!validarId(id)) {
                return res.status(400).json({
                    data: null,
                    error: {
                        message: 'El identificador del problema interno no es válido.'
                    }
                })
            }

            const result = await supabase
                .from('problemas')
                .delete()
                .eq('id', Number(id))
                .select('id')
                .maybeSingle()

            if (result.error) {
                console.error('Error al eliminar problema interno:', result.error)

                if (result.error.code === '23503') {
                    return res.status(409).json({
                        data: null,
                        error: {
                            message: 'No se puede eliminar el problema interno porque está relacionado con otros registros.'
                        }
                    })
                }

                return res.status(500).json({
                    data: null,
                    error: {
                        message: 'Ocurrió un error al eliminar el problema interno.'
                    }
                })
            }

            if (!result.data) {
                return res.status(404).json({
                    data: null,
                    error: {
                        message: 'El problema interno no existe o ya fue eliminado.'
                    }
                })
            }

            return responder(res, result)

        } catch (error) {
            console.error('Error inesperado al eliminar problema interno:', error)

            return res.status(500).json({
                data: null,
                error: {
                    message: 'Error interno al eliminar el problema interno.'
                }
            })
        }
    }
)

// ==========================================
// DELETE: Problema externo
// Tabla: problemas_externos
// Rol permitido: Director General [1]
// ==========================================
router.delete(
    '/problema_externo',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { id } = req.body

            if (!validarId(id)) {
                return res.status(400).json({
                    data: null,
                    error: {
                        message: 'El identificador del problema externo no es válido.'
                    }
                })
            }

            const result = await supabase
                .from('problemas_externos')
                .delete()
                .eq('id', Number(id))
                .select('id')
                .maybeSingle()

            if (result.error) {
                console.error('Error al eliminar problema externo:', result.error)

                if (result.error.code === '23503') {
                    return res.status(409).json({
                        data: null,
                        error: {
                            message: 'No se puede eliminar el problema externo porque está relacionado con otros registros.'
                        }
                    })
                }

                return res.status(500).json({
                    data: null,
                    error: {
                        message: 'Ocurrió un error al eliminar el problema externo.'
                    }
                })
            }

            if (!result.data) {
                return res.status(404).json({
                    data: null,
                    error: {
                        message: 'El problema externo no existe o ya fue eliminado.'
                    }
                })
            }

            return responder(res, result)

        } catch (error) {
            console.error('Error inesperado al eliminar problema externo:', error)

            return res.status(500).json({
                data: null,
                error: {
                    message: 'Error interno al eliminar el problema externo.'
                }
            })
        }
    }
)

// ==========================================
// DELETE: Departamento interno
// Tabla: departamentos
// Rol permitido: Director General [1]
// ==========================================
router.delete(
    '/departamento_interno',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { id } = req.body

            if (!validarId(id)) {
                return res.status(400).json({
                    data: null,
                    error: {
                        message: 'El identificador del departamento interno no es válido.'
                    }
                })
            }

            const result = await supabase
                .from('departamentos')
                .delete()
                .eq('id', Number(id))
                .select('id')
                .maybeSingle()

            if (result.error) {
                console.error('Error al eliminar departamento interno:', result.error)

                if (result.error.code === '23503') {
                    return res.status(409).json({
                        data: null,
                        error: {
                            message: 'No se puede eliminar el departamento interno porque está relacionado con otros registros.'
                        }
                    })
                }

                return res.status(500).json({
                    data: null,
                    error: {
                        message: 'Ocurrió un error al eliminar el departamento interno.'
                    }
                })
            }

            if (!result.data) {
                return res.status(404).json({
                    data: null,
                    error: {
                        message: 'El departamento interno no existe o ya fue eliminado.'
                    }
                })
            }

            return responder(res, result)

        } catch (error) {
            console.error('Error inesperado al eliminar departamento interno:', error)

            return res.status(500).json({
                data: null,
                error: {
                    message: 'Error interno al eliminar el departamento interno.'
                }
            })
        }
    }
)

// ==========================================
// DELETE: Departamento externo
// Tabla: departamentos_externos
// Rol permitido: Director General [1]
// ==========================================
router.delete(
    '/departamento_externo',
    verificarTokenJWT,
    validarAutenticacion,
    validarAutorizacion([1]),
    async (req, res) => {
        try {
            const { id } = req.body

            if (!validarId(id)) {
                return res.status(400).json({
                    data: null,
                    error: {
                        message: 'El identificador del departamento externo no es válido.'
                    }
                })
            }

            const result = await supabase
                .from('departamentos_externos')
                .delete()
                .eq('id', Number(id))
                .select('id')
                .maybeSingle()

            if (result.error) {
                console.error('Error al eliminar departamento externo:', result.error)

                if (result.error.code === '23503') {
                    return res.status(409).json({
                        data: null,
                        error: {
                            message: 'No se puede eliminar el departamento externo porque está relacionado con otros registros.'
                        }
                    })
                }

                return res.status(500).json({
                    data: null,
                    error: {
                        message: 'Ocurrió un error al eliminar el departamento externo.'
                    }
                })
            }

            if (!result.data) {
                return res.status(404).json({
                    data: null,
                    error: {
                        message: 'El departamento externo no existe o ya fue eliminado.'
                    }
                })
            }

            return responder(res, result)

        } catch (error) {
            console.error('Error inesperado al eliminar departamento externo:', error)

            return res.status(500).json({
                data: null,
                error: {
                    message: 'Error interno al eliminar el departamento externo.'
                }
            })
        }
    }
)

export default router
