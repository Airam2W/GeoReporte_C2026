import { Router } from 'express'
import { supabase } from '../config/supabase.js'
import { responder } from '../helpers/response.js'

const router = Router()

// POST /select/:tabla  (selectAll)
router.post('/select/:tabla', async (req, res) => {
  const { tabla } = req.params
  const { columnas = ['*'] } = req.body

  const result = await supabase.from(tabla).select(columnas.join(','))
  responder(res, result)
})

// POST /select/:tabla/neq  (selectNeq)
router.post('/select/:tabla/neq', async (req, res) => {
  const { tabla } = req.params
  const { campo, valor, columnas = ['*'] } = req.body

  const result = await supabase.from(tabla).select(columnas.join(',')).neq(campo, valor)
  responder(res, result)
})

// POST /select/:tabla/neq/order  (selectNeqOrder)
router.post('/select/:tabla/neq/order', async (req, res) => {
  const { tabla } = req.params
  const { campo, valor, orderBy, columnas = ['*'], ascending = true } = req.body

  const result = await supabase
    .from(tabla)
    .select(columnas.join(','))
    .neq(campo, valor)
    .order(orderBy, { ascending })
  responder(res, result)
})

// DELETE /delete/:tabla/eq  (deleteEq)
router.delete('/delete/:tabla/eq', async (req, res) => {
  const { tabla } = req.params
  const { campo, valor } = req.body

  const result = await supabase.from(tabla).delete().eq(campo, valor)
  responder(res, result)
})

// BORRAR --------------------------------- POST /select/:tabla/ilike  (selectIlike)
router.post('/select/:tabla/ilike', async (req, res) => {
  const { tabla } = req.params
  const { campo, valor, columnas = ['*'] } = req.body

  const result = await supabase.from(tabla).select(columnas.join(',')).ilike(campo, valor)
  responder(res, result)
})



// POST /select/:tabla/ilike/maybeSingle  (selectIlikeMaybeSingle)
router.post('/select/:tabla/ilike/maybeSingle', async (req, res) => {
  const { tabla } = req.params
  const { campo, valor } = req.body

  const result = await supabase.from(tabla).select('*').ilike(campo, valor).maybeSingle()
  responder(res, result)
})

// POST /select/:tabla/eq/single  (selectEqSingle)
router.post('/select/:tabla/eq/single', async (req, res) => {
  const { tabla } = req.params
  const { campo, valor, columnas = ['*'] } = req.body

  const result = await supabase
    .from(tabla)
    .select(columnas.join(','))
    .eq(campo, valor)
    .single()
  responder(res, result)
})

// POST /select/:tabla/eq  (selectEq)
router.post('/select/:tabla/eq', async (req, res) => {
  const { tabla } = req.params
  const { campo, valor, columnas = ['*'] } = req.body

  const result = await supabase.from(tabla).select(columnas.join(',')).eq(campo, valor)
  responder(res, result)
})

// PUT /update/:tabla/eq  (updateEq)
router.put('/update/:tabla/eq', async (req, res) => {
  const { tabla } = req.params
  const { campo, valor, data: payload } = req.body

  const result = await supabase.from(tabla).update(payload).eq(campo, valor)
  responder(res, result)
})

// POST /rpc/:fn  (callRpc)
router.post('/rpc/:fn', async (req, res) => {
  const { fn } = req.params
  const params = req.body

  const result = await supabase.rpc(fn, params)
  responder(res, result)
})

// POST /insert/:tabla  (insert)
router.post('/insert/:tabla', async (req, res) => {
  const { tabla } = req.params
  const payload = req.body

  const result = await supabase.from(tabla).insert(payload)
  responder(res, result)
})

// POST /select/:tabla/order  (selectOrder)
router.post('/select/:tabla/order', async (req, res) => {
  const { tabla } = req.params
  const { campo, columnas = ['*'], ascending = true } = req.body

  const result = await supabase
    .from(tabla)
    .select(columnas.join(','))
    .order(campo, { ascending })
  responder(res, result)
})

// POST /select/:tabla/eq/order  (selectEqOrder)
router.post('/select/:tabla/eq/order', async (req, res) => {
  const { tabla } = req.params
  const { campo, valor, orderBy, columnas = ['*'], ascending = true } = req.body

  const result = await supabase
    .from(tabla)
    .select(columnas.join(','))
    .eq(campo, valor)
    .order(orderBy, { ascending })
  responder(res, result)
})

export default router