import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import storageRoutes from './routes/storage.routes.js'
import supabaseGetRoutes from './routes/supabaseGet.routes.js'
import supabasePostRoutes from './routes/supabasePost.routes.js'
import supabasePutRoutes from './routes/supabasePut.routes.js'
import supabaseDeleteRoutes from './routes/supabaseDelete.routes.js'

const app = express()

app.use(cors())
app.use(express.json())

// Montaje de rutas
app.use('/', storageRoutes)
app.use('/', supabaseGetRoutes)
app.use('/', supabasePostRoutes)
app.use('/', supabasePutRoutes)
app.use('/', supabaseDeleteRoutes)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor backend de GeoReporte escuchando en puerto ${PORT} !!`)
})