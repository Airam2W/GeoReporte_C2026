import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import queryRoutes from './routes/query.routes.js'
import storageRoutes from './routes/storage.routes.js'
import supabaseRoutes from './routes/supabase.routes.js'

const app = express()

app.use(cors())
app.use(express.json())


// Montaje de rutas
app.use('/', queryRoutes)
app.use('/', storageRoutes)
app.use('/', supabaseRoutes)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor backend de GeoReporte escuchando en puerto ${PORT} !!`)
})