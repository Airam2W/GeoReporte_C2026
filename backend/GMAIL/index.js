import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { google } from 'googleapis'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middlewares
app.use(cors())
// El límite sube a 15 MB porque el endpoint del PDF recibe el archivo en base64
app.use(express.json({ limit: '15mb' }))

// Configuración global del cliente OAuth2 usando Refresh Token
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI,
)

oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
})

// ----------------------- Configuración -----------------------

const URL_BUSCADOR = process.env.BUSCADOR_URL || 'https://airam2w.github.io/GeoReporte_C2026/'
const REMITENTE_NOMBRE = 'Soporte de GeoReporte'
// Poner MARCAR_IMPORTANTE=false en el .env para desactivar el marcado
const MARCAR_IMPORTANTE = process.env.MARCAR_IMPORTANTE !== 'false'
const MAX_PDF_BYTES = 10 * 1024 * 1024

;['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'GMAIL_USER_EMAIL'].forEach(
  (v) => {
    if (!process.env[v]) console.warn(`⚠️ Falta la variable de entorno ${v}`)
  },
)

// ----------------------- Validaciones y utilidades -----------------------

class ErrorValidacion extends Error {
  constructor(mensaje, errores = []) {
    super(mensaje)
    this.errores = errores
  }
}

const REGEX_CORREO = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/

// Quita saltos de línea (evita inyección de cabeceras) y limita el largo
const limpiarLinea = (valor, max = 200) =>
  String(valor ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, max)

// Campo de texto obligatorio
const requerido = (valor, nombre, max = 200, errores) => {
  const t = limpiarLinea(valor, max)
  if (!t) errores.push(`${nombre} es obligatorio`)
  return t
}

// Campo de texto opcional con valor por defecto
const opcional = (valor, fallback, max = 200) => limpiarLinea(valor, max) || fallback

// Texto largo que conserva saltos de línea (descripciones, notas)
const textoLargo = (valor, max = 2000) =>
  String(valor ?? '')
    .replace(/\r/g, '')
    .trim()
    .slice(0, max)

const validarCorreo = (valor, errores) => {
  const c = String(valor ?? '').trim()
  if (!c) {
    errores.push('El correo del destinatario es obligatorio')
    return ''
  }
  if (c.length > 254 || !REGEX_CORREO.test(c)) {
    errores.push('El correo del destinatario no es válido')
    return ''
  }
  return c
}

const lanzarSiHayErrores = (errores) => {
  if (errores.length) throw new ErrorValidacion('Datos inválidos', errores)
}

const esc = (valor) =>
  String(valor ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )

const escMultilinea = (valor) => esc(valor).replace(/\n/g, '<br>')

// Valida el PDF recibido en base64 (acepta también formato data URL)
const decodificarPdf = (pdfBlob, nombreArchivo, errores) => {
  if (typeof pdfBlob !== 'string' || !pdfBlob) {
    errores.push('pdfBlob es obligatorio y debe enviarse como texto base64')
    return null
  }
  const base64 = pdfBlob.replace(/^data:application\/pdf;base64,/, '')
  const buffer = Buffer.from(base64, 'base64')
  if (!buffer.length) {
    errores.push('El PDF está vacío')
    return null
  }
  if (buffer.length > MAX_PDF_BYTES) {
    errores.push('El PDF supera el tamaño máximo de 10 MB')
    return null
  }
  if (buffer.subarray(0, 4).toString('latin1') !== '%PDF') {
    errores.push('El archivo adjunto no es un PDF válido')
    return null
  }
  let nombre = limpiarLinea(nombreArchivo, 100).replace(/[^\w.\-]/g, '_') || 'Reporte.pdf'
  if (!/\.pdf$/i.test(nombre)) nombre += '.pdf'
  return { nombre, buffer }
}

const fechaActual = () =>
  new Date().toLocaleString('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Mazatlan',
  })

// ----------------------- Plantilla HTML corporativa -----------------------
// Se usan tablas y estilos en línea porque los clientes de correo ignoran gran parte del CSS moderno

const TINTO = '#621132'
const DORADO = '#d5c98a'

const parrafo = (html) =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;">${html}</p>`

const cajaFolio = (folio) => `
  <p style="margin:0 0 6px;font-size:11px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:#777777;">Número de folio</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px;">
    <tr>
      <td style="background:#f5f3ef;border:1px dashed #c9bfae;border-radius:8px;padding:14px 16px;text-align:center;">
        <span style="font-family:Consolas,'Courier New',monospace;font-size:18px;font-weight:bold;color:${TINTO};letter-spacing:0.5px;word-break:break-all;-webkit-user-select:all;user-select:all;">${esc(folio)}</span>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 20px;font-size:12px;color:#888888;text-align:center;">Mantén presionado o haz doble clic sobre el folio para seleccionarlo y copiarlo.</p>`

const tablaDatos = (filas) => {
  const validas = filas.filter(([, v]) => v)
  if (!validas.length) return ''
  const html = validas
    .map(
      ([etiqueta, valor]) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eeeeee;">
          <div style="font-size:11px;font-weight:bold;letter-spacing:0.4px;text-transform:uppercase;color:#888888;">${esc(etiqueta)}</div>
          <div style="font-size:14px;color:#222222;margin-top:3px;line-height:1.5;">${escMultilinea(valor)}</div>
        </td>
      </tr>`,
    )
    .join('')
  return `
    <p style="margin:8px 0 4px;font-size:13px;font-weight:bold;color:${TINTO};text-transform:uppercase;letter-spacing:0.5px;">Información del reporte</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-top:2px solid ${TINTO};">${html}</table>`
}

const cajaNota = (titulo, texto, color = TINTO) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    <tr>
      <td style="background:#fafafa;border:1px solid #eeeeee;border-left:4px solid ${color};border-radius:6px;padding:14px 16px;">
        <div style="font-size:11px;font-weight:bold;letter-spacing:0.4px;text-transform:uppercase;color:#777777;margin-bottom:6px;">${esc(titulo)}</div>
        <div style="font-size:14px;line-height:1.6;color:#333333;">${escMultilinea(texto)}</div>
      </td>
    </tr>
  </table>`

const botonLink = (texto, url) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px auto 20px;">
    <tr>
      <td style="background:${TINTO};border-radius:8px;">
        <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">${esc(texto)}</a>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 20px;font-size:12px;color:#888888;text-align:center;word-break:break-all;">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${esc(url)}" target="_blank" style="color:${TINTO};">${esc(url)}</a></p>`

const plantillaCorreo = ({ titulo, subtitulo, cuerpo }) => `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${TINTO};padding:26px 28px 22px;border-bottom:4px solid ${DORADO};">
            <div style="font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">GeoReporte</div>
            <div style="font-size:13px;color:#f0dde6;margin-top:4px;">Ayuntamiento de Culiacán · Plataforma ciudadana de reportes</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 8px;">
            <h1 style="margin:0 0 4px;font-size:21px;color:${TINTO};">${esc(titulo)}</h1>
            ${subtitulo ? `<p style="margin:0 0 20px;font-size:14px;color:#777777;">${esc(subtitulo)}</p>` : '<div style="height:16px;"></div>'}
            ${cuerpo}
          </td>
        </tr>
        <tr>
          <td style="background:#faf8f5;padding:18px 28px;border-top:1px solid #eeeeee;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#777777;">Este es un mensaje automático, por favor no respondas a este correo.</p>
            <p style="margin:0;font-size:12px;color:#999999;">Ayuntamiento de Culiacán · GeoReporte · ${esc(fechaActual())}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

// ----------------------- Envío por Gmail -----------------------

const envolverBase64 = (buffer) => buffer.toString('base64').replace(/.{1,76}/g, '$&\r\n')

const codificarAsunto = (asunto) => `=?UTF-8?B?${Buffer.from(asunto, 'utf8').toString('base64')}?=`

const construirMime = ({ destinatario, asunto, html, adjuntos }) => {
  const cabeceras = [
    `From: ${REMITENTE_NOMBRE} <${process.env.GMAIL_USER_EMAIL}>`,
    `To: ${destinatario}`,
    `Subject: ${codificarAsunto(asunto)}`,
    'MIME-Version: 1.0',
  ]

  // Cabeceras de prioridad: los clientes que las respetan lo muestran como importante
  if (MARCAR_IMPORTANTE) {
    cabeceras.push('Importance: high', 'X-Priority: 1 (Highest)', 'X-MSMail-Priority: High')
  }

  const parteHtml = [
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    envolverBase64(Buffer.from(html, 'utf8')),
  ]

  if (!adjuntos.length) {
    return [...cabeceras, ...parteHtml].join('\r\n')
  }

  const limite = `georeporte_${Date.now().toString(16)}`
  const partes = [
    `--${limite}`,
    ...parteHtml,
    ...adjuntos.flatMap((a) => [
      `--${limite}`,
      `Content-Type: application/pdf; name="${a.nombre}"`,
      `Content-Disposition: attachment; filename="${a.nombre}"`,
      'Content-Transfer-Encoding: base64',
      '',
      envolverBase64(a.buffer),
    ]),
    `--${limite}--`,
  ]

  return [
    ...cabeceras,
    `Content-Type: multipart/mixed; boundary="${limite}"`,
    '',
    ...partes,
  ].join('\r\n')
}

const enviarCorreo = async ({ destinatario, asunto, html, adjuntos = [] }) => {
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

  const raw = Buffer.from(construirMime({ destinatario, asunto, html, adjuntos }))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const respuesta = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } })

  // Etiqueta "Importante" en la copia de la cuenta remitente.
  // Requiere el scope gmail.modify; si no lo tiene, el correo ya salió y solo se registra el aviso.
  let marcadoImportante = false
  if (MARCAR_IMPORTANTE) {
    try {
      await gmail.users.messages.modify({
        userId: 'me',
        id: respuesta.data.id,
        requestBody: { addLabelIds: ['IMPORTANT'] },
      })
      marcadoImportante = true
    } catch (e) {
      console.warn('⚠️ No se pudo marcar como Importante:', e.response?.data?.error?.message || e.message)
    }
  }

  return { id: respuesta.data.id, marcadoImportante }
}

// Manejo común de respuestas y errores
const responderError = (res, error, contexto) => {
  if (error instanceof ErrorValidacion) {
    return res.status(400).json({ ok: false, mensaje: error.message, errores: error.errores })
  }
  console.error(`❌ ERROR (${contexto}):`, error.response?.data || error.message)
  return res.status(500).json({
    ok: false,
    mensaje: 'Error interno al procesar el envío del correo',
    error: error.response?.data?.error?.message || error.message,
  })
}

const responderOk = (res, resultado) =>
  res.status(200).json({
    ok: true,
    mensaje: 'Correo enviado exitosamente',
    idMessage: resultado.id,
    importante: resultado.marcadoImportante,
  })

const datosBody = (req) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new ErrorValidacion('El cuerpo de la solicitud debe ser un objeto JSON')
  }
  return req.body
}

// ----------------------- Endpoints -----------------------

// (enviarCorreoCreacionReporte)
app.post('/enviar/correo/creacion-reporte', async (req, res) => {
  try {
    const d = datosBody(req)
    const errores = []

    const destinatario = validarCorreo(d.correo, errores)
    const folio = requerido(d.folio, 'El folio', 100, errores)
    lanzarSiHayErrores(errores)

    const nombre = opcional(d.nombre, 'Ciudadano Honorable', 100)
    const departamento = opcional(d.departamento, '', 150)
    const problema = opcional(d.problema, '', 150)
    const descripcion = textoLargo(d.descripcion, 1000)
    const domicilio = opcional(d.domicilio, '', 250)
    const referencias = opcional(d.referencias, '', 250)

    const cuerpo = `
      ${parrafo(`Estimado(a) <strong>${esc(nombre)}</strong>:`)}
      ${parrafo('Te informamos que tu reporte ha sido <strong>creado correctamente</strong> y fue canalizado al área responsable para su atención.')}
      ${cajaFolio(folio)}
      ${tablaDatos([
        ['Departamento', departamento],
        ['Problemática', problema],
        ['Descripción', descripcion],
        ['Domicilio', domicilio],
        ['Referencias', referencias],
      ])}
      ${parrafo('Utiliza el siguiente enlace para <strong>consultar el estado actual de tu reporte</strong> con tu número de folio:')}
      ${botonLink('Consultar estado de mi reporte', URL_BUSCADOR)}
      ${parrafo('Gracias por utilizar <strong>GeoReporte</strong> y por contribuir al mejoramiento de nuestra ciudad. Te mantendremos informado(a) por este medio sobre cualquier cambio en el estado de tu reporte.')}
      ${parrafo('Atentamente,<br><strong>Ayuntamiento de Culiacán</strong>')}`

    const resultado = await enviarCorreo({
      destinatario,
      asunto: `Nuevo Reporte: ${folio}`,
      html: plantillaCorreo({
        titulo: 'Tu reporte fue creado con éxito',
        subtitulo: 'Confirmación de registro',
        cuerpo,
      }),
    })

    return responderOk(res, resultado)
  } catch (error) {
    return responderError(res, error, 'creacion-reporte')
  }
})

// (enviarCorreoRechazoReporte)
app.post('/enviar/correo/rechazo-reporte', async (req, res) => {
  try {
    const d = datosBody(req)
    const errores = []

    const destinatario = validarCorreo(d.correo, errores)
    const folio = requerido(d.folio, 'El folio', 100, errores)
    const titulo = requerido(d.titulo, 'El título del rechazo', 200, errores)
    lanzarSiHayErrores(errores)

    const notas = textoLargo(d.notas, 2000)
    const departamento = opcional(d.departamento, '', 150)
    const problema = opcional(d.problema, '', 150)

    const cuerpo = `
      ${parrafo('Estimado(a) ciudadano(a):')}
      ${parrafo('Lamentamos informarte que, tras su revisión, tu reporte <strong>no pudo ser atendido y ha sido rechazado</strong>.')}
      ${cajaFolio(folio)}
      ${cajaNota(`Motivo del rechazo: ${titulo}`, notas || 'No se registraron observaciones adicionales.', '#c62828')}
      ${tablaDatos([
        ['Departamento', departamento],
        ['Problemática', problema],
      ])}
      ${parrafo('Si consideras que se trata de un error o deseas aportar más información, puedes levantar un nuevo reporte desde la plataforma GeoReporte.')}
      ${botonLink('Consultar mi reporte', URL_BUSCADOR)}
      ${parrafo('Agradecemos tu participación y tu interés en mejorar Culiacán.')}
      ${parrafo('Atentamente,<br><strong>Ayuntamiento de Culiacán</strong>')}`

    const resultado = await enviarCorreo({
      destinatario,
      asunto: `Reporte rechazado: ${folio}`,
      html: plantillaCorreo({
        titulo: 'Tu reporte fue rechazado',
        subtitulo: 'Notificación de resolución',
        cuerpo,
      }),
    })

    return responderOk(res, resultado)
  } catch (error) {
    return responderError(res, error, 'rechazo-reporte')
  }
})

// (enviarCorreoFinalizacionReporte)
app.post('/enviar/correo/finalizacion-reporte', async (req, res) => {
  try {
    const d = datosBody(req)
    const errores = []

    const destinatario = validarCorreo(d.correo, errores)
    const folio = requerido(d.folio, 'El folio', 100, errores)

    const decision = limpiarLinea(d.decision, 20).toLowerCase()
    if (!['aceptada', 'denegada'].includes(decision)) {
      errores.push('decision debe ser "aceptada" o "denegada"')
    }
    lanzarSiHayErrores(errores)

    const notas = textoLargo(d.notas, 2000)
    const jefe = opcional(d.jefe, '', 150)
    const supervisor = opcional(d.supervisor, '', 150)

    const aceptada = decision === 'aceptada'

    const intro = aceptada
      ? 'Con agrado te informamos que tu reporte ha sido <strong>atendido y finalizado</strong> por el personal responsable.'
      : 'Te informamos que, tras la revisión del supervisor, el cierre del reporte <strong>no fue validado</strong>. Tu reporte continúa <strong>en proceso de atención</strong> y se realizarán las acciones necesarias para concluirlo.'

    const cuerpo = `
      ${parrafo('Estimado(a) ciudadano(a):')}
      ${parrafo(intro)}
      ${cajaFolio(folio)}
      ${notas ? cajaNota(aceptada ? 'Observaciones del cierre' : 'Observaciones del supervisor', notas, aceptada ? '#2e7d32' : '#f57f17') : ''}
      ${tablaDatos([
        ['Estado', aceptada ? 'Finalizado' : 'En proceso'],
        ['Supervisor responsable', supervisor],
        ['Personal que atendió', jefe],
      ])}
      ${parrafo('Puedes consultar el estado de tu reporte en cualquier momento con tu número de folio:')}
      ${botonLink('Consultar estado de mi reporte', URL_BUSCADOR)}
      ${parrafo(aceptada ? 'Gracias por tu participación y por ayudarnos a construir una mejor ciudad.' : 'Te seguiremos informando por este medio sobre cualquier avance.')}
      ${parrafo('Atentamente,<br><strong>Ayuntamiento de Culiacán</strong>')}`

    const resultado = await enviarCorreo({
      destinatario,
      asunto: aceptada ? `Reporte finalizado: ${folio}` : `Actualización de tu reporte: ${folio}`,
      html: plantillaCorreo({
        titulo: aceptada ? 'Tu reporte ha sido finalizado' : 'Actualización de tu reporte',
        subtitulo: aceptada ? 'Notificación de cierre' : 'Notificación de seguimiento',
        cuerpo,
      }),
    })

    return responderOk(res, resultado)
  } catch (error) {
    return responderError(res, error, 'finalizacion-reporte')
  }
})

// (enviarCorreoTurnadoReporte)
app.post('/enviar/correo/turnado-reporte', async (req, res) => {
  try {
    const d = datosBody(req)
    const errores = []

    const destinatario = validarCorreo(d.correo, errores)
    const folio = requerido(d.folio, 'El folio', 100, errores)
    const anterior = requerido(d.departamentoAnteriorNombre, 'El departamento anterior', 150, errores)
    const nuevo = requerido(d.departamentoTurnadoNombre, 'El departamento al que se turna', 150, errores)
    lanzarSiHayErrores(errores)

    const administrador = opcional(d.administradorNombre, '', 150)
    const tipo = limpiarLinea(d.tipo, 20).toLowerCase()
    const tipoTexto = tipo === 'externo' ? 'Dependencia externa' : tipo === 'interno' ? 'Departamento interno' : ''

    const cuerpo = `
      ${parrafo('Estimado(a) ciudadano(a):')}
      ${parrafo(`Te informamos que tu reporte ha sido <strong>turnado</strong> del departamento <strong>${esc(anterior)}</strong> al departamento <strong>${esc(nuevo)}</strong>, por corresponder a su ámbito de atención.`)}
      ${cajaFolio(folio)}
      ${tablaDatos([
        ['Departamento anterior', anterior],
        ['Departamento al que se turnó', nuevo],
        ['Tipo de área', tipoTexto],
        ['Administrador responsable', administrador],
      ])}
      ${parrafo('Este cambio no requiere ninguna acción de tu parte. Puedes consultar el estado de tu reporte con tu número de folio:')}
      ${botonLink('Consultar estado de mi reporte', URL_BUSCADOR)}
      ${parrafo('Gracias por tu paciencia y por utilizar <strong>GeoReporte</strong>. Te seguiremos informando por este medio.')}
      ${parrafo('Atentamente,<br><strong>Ayuntamiento de Culiacán</strong>')}`

    const resultado = await enviarCorreo({
      destinatario,
      asunto: `Reporte turnado: ${folio}`,
      html: plantillaCorreo({
        titulo: 'Tu reporte fue turnado',
        subtitulo: 'Notificación de seguimiento',
        cuerpo,
      }),
    })

    return responderOk(res, resultado)
  } catch (error) {
    return responderError(res, error, 'turnado-reporte')
  }
})

// (enviarCorreoReportePDF)
// pdfBlob debe llegar como texto base64 (un Blob no viaja en JSON)
app.post('/enviar/correo/reporte-pdf', async (req, res) => {
  try {
    const d = datosBody(req)
    const errores = []

    const destinatario = validarCorreo(d.correo, errores)
    const folio = requerido(d.folio, 'El folio', 100, errores)
    const pdf = decodificarPdf(d.pdfBlob, d.nombreArchivo, errores)
    lanzarSiHayErrores(errores)

    const departamento = opcional(d.departamento, '', 150)
    const supervisor = opcional(d.supervisor, '', 150)

    const cuerpo = `
      ${parrafo('Estimado(a) usuario(a):')}
      ${parrafo('Se ha <strong>descargado la ficha oficial</strong> del reporte indicado y, como lo solicitaste, te enviamos una copia en formato PDF <strong>adjunta a este correo</strong>.')}
      ${cajaFolio(folio)}
      ${tablaDatos([
        ['Departamento', departamento],
        ['Supervisor responsable', supervisor],
        ['Archivo adjunto', pdf.nombre],
      ])}
      ${parrafo('Este documento es de <strong>uso interno</strong> del Ayuntamiento de Culiacán. Te pedimos resguardarlo y no compartirlo con personas ajenas al proceso de atención.')}
      ${parrafo('Atentamente,<br><strong>Ayuntamiento de Culiacán</strong>')}`

    const resultado = await enviarCorreo({
      destinatario,
      asunto: `Ficha del reporte ${folio}`,
      html: plantillaCorreo({
        titulo: 'Ficha del reporte en PDF',
        subtitulo: 'Documento adjunto',
        cuerpo,
      }),
      adjuntos: [pdf],
    })

    return responderOk(res, resultado)
  } catch (error) {
    return responderError(res, error, 'reporte-pdf')
  }
})

// ----------------------- LISTEN -----------------------

app.listen(PORT, () => {
  console.log(`Servidor externo de Gmail en GeoReporte escuchando en puerto ${PORT} !!`)
})

// Comando para ejecutar el servidor: node index.js