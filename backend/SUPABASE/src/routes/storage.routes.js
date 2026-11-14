import { Router } from 'express'
import multer from 'multer'
import { supabase } from '../config/supabase.js'
import { responder } from '../helpers/response.js'
import { verificarTurnstile } from '../middleware/verificarTurnstile.js' // Tu middleware de Turnstile
import { verificarTokenJWT, validarAutorizacion } from '../middleware/auth.js' // Tus middlewares de JWT y roles
import { registrarHistorial } from '../utils/registrarHistorial.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// ==========================================
// 1. SUBIDA DE FOTOS DE REPORTES (CIUDADANOS)
// ==========================================
// Usa el bucket 'fotos'. Está protegido por Cloudflare Turnstile para evitar bots.
router.post('/storage/fotos/upload', upload.single('file'), async (req, res) => {
  const { filePath } = req.body
  const file = req.file

  if (!file) {
    return res.status(400).json({ data: null, error: { message: 'No se recibió ningún archivo' } })
  }

  const result = await supabase.storage
    .from('fotos')
    .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true })

  if (result.error) {
    return res.status(500).json({ data: null, error: result.error })
  }

  return res.status(200).json({ data: result.data, error: null })
})

// ==========================================
// 2. SUBIDA DE FOTOS DE AVANCES (JEFES)
// ==========================================
// Usa el bucket 'fotos_avances'. Protegido por JWT, exigiendo rol de Jefe (tipo_id === 4).
router.post('/storage/fotos_avances/upload', verificarTokenJWT, validarAutorizacion([4]), upload.single('file'), async (req, res) => {
  const { filePath } = req.body
  const file = req.file

  if (!file) {
    return res.status(400).json({ data: null, error: { message: 'No se recibió ningún archivo' } })
  }

  const result = await supabase.storage
    .from('fotos_avances')
    .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true })

  if (result.error) {
    return res.status(500).json({ data: null, error: result.error })
  }

  return res.status(200).json({ data: result.data, error: null })
})

// ==========================================
// 3. OBTENER URL PÚBLICA (GENÉRICA PARA AMBOS)
// ==========================================
const BUCKETS_PERMITIDOS = ['fotos', 'fotos_avances']

router.post('/storage/:bucket/publicUrl', async (req, res) => {
  const { bucket } = req.params
  const { filePath } = req.body

  if (!BUCKETS_PERMITIDOS.includes(bucket)) {
    return res.status(400).json({ data: null, error: { message: 'Bucket no permitido' } })
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return res.status(200).json({ data, error: null })
})

export default router