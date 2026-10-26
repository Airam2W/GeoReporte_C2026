import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { google } from 'googleapis'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middlewares
app.use(cors())
app.use(express.json())

// Configuración global del cliente OAuth2 usando Refresh Token
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
)

oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN
})

// ----------------------- Endpoints -----------------------
app.post('/enviar-correo', async (req, res) => {

  try {
    const {data} = req.body;
    const correoUsuario = data.correo;

    // Construccion del correo
    const destinatario = correoUsuario
    const remitenteNombre = 'GeoReporte'
    const asunto = `Nuevo Reporte: ${data.folio}`
    const contenido = `
      <p>Se ha creado un nuevo reporte con el folio: ${data.folio}</p>
      <p>Departamento: ${data.departamento}</p>
      <p>Problema: ${data.problema}</p>
    `

    // 1. Validar campos obligatorios
    if (!destinatario || !asunto || !contenido) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Faltan campos obligatorios: destinatario, asunto y contenido son requeridos.'
      })
    }

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

    // 2. Construir la estructura del correo en formato RFC 2822
    const subjectEnc = `=?UTF-8?B?${Buffer.from(asunto).toString('base64')}?=`
    const remitente = remitenteNombre || 'Mi App'
    const emailRemitente = process.env.GMAIL_USER_EMAIL

    const mimeMessage = [
      `From: ${remitente} <${emailRemitente}>`,
      `To: ${destinatario}`,
      `Subject: ${subjectEnc}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      contenido
    ].join('\n')

    // 3. Codificar en base64url requerido por la API de Gmail
    const encodedMessage = Buffer.from(mimeMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // 4. Ejecutar el envío a través del endpoint de Google
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    })

    // 5. Respuesta exitosa del endpoint
    return res.status(200).json({
      ok: true,
      mensaje: 'Correo enviado exitosamente',
      idMessage: response.data.id
    })

  } catch (error) {
    console.error('❌ ERROR DETALLADO DE GOOGLE:', error.response?.data || error.message);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error interno al procesar el envío del correo',
      error: error.response?.data?.error?.message || error.message
    })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor externo de Gmail en GeoReporte escuchando en puerto ${PORT} !!`)
})

// Comando para ejecutar el servidor: node server.js