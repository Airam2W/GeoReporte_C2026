export function responder(res, { data = null, error = null, status = null }) {
  if (error) {
    const statusCode = status || 400

    return res.status(statusCode).json({
      data: null,
      error: {
        message: error.message || 'Ocurrió un error en la solicitud.'
      }
    })
  }

  return res.status(status || 200).json({
    data,
    error: null
  })
}