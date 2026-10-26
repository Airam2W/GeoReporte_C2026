import { Router } from 'express'
import multer from 'multer'
import { supabase } from '../config/supabase.js'
import { responder } from '../helpers/response.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

const BUCKETS_PERMITIDOS = ['fotos', 'fotos_avances']

router.post('/storage/:bucket/upload', upload.single('file'), async (req, res) => {
  const { bucket } = req.params
  const { filePath } = req.body
  const file = req.file

  if (!BUCKETS_PERMITIDOS.includes(bucket)) {
    return res.status(400).json({ data: null, error: { message: 'Bucket no permitido' } })
  }
  if (!file) {
    return res.status(400).json({ data: null, error: { message: 'No se recibió ningún archivo' } })
  }

  const result = await supabase.storage
    .from(bucket)
    .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true })
  responder(res, result)
})

router.post('/storage/:bucket/publicUrl', async (req, res) => {
  const { bucket } = req.params
  const { filePath } = req.body

  if (!BUCKETS_PERMITIDOS.includes(bucket)) {
    return res.status(400).json({ data: null, error: { message: 'Bucket no permitido' } })
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  res.status(200).json({ data, error: null })
})

export default router