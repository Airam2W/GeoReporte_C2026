export async function verificarTurnstile(req, res, next) {
  const token = req.body?.turnstileToken

  if (!token || typeof token !== 'string' || token.length > 2048) {
    return res.status(400).json({
      data: null,
      error: { message: 'Falta la verificación de seguridad' },
    })
  }

  try {
    const params = new URLSearchParams()
    params.append('secret', process.env.TURNSTILE_SECRET_KEY)
    params.append('response', token)

    const respuesta = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: params,
    })
    const resultado = await respuesta.json()

    if (!resultado.success) {
      console.warn('Turnstile rechazado:', resultado['error-codes'])
      return res.status(403).json({
        data: null,
        error: { message: 'No se pudo validar la seguridad de la solicitud' },
      })
    }

    // El token no es una columna de la tabla: se quita para que no llegue al insert
    delete req.body.turnstileToken
    next()
  } catch (error) {
    console.error('Error al verificar Turnstile:', error)
    return res.status(500).json({
      data: null,
      error: { message: 'Error al verificar la seguridad' },
    })
  }
}