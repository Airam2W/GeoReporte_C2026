

export const obtenerClaseEstado = (estado: string) => {
  const clases: Record<string, string> = {
    llegado: 'badge-azul',
    'en proceso': 'badge-amarillo',
    finalizado: 'badge-verde',
    rechazado: 'badge-rojo',
  }
  return clases[estado] || 'badge-gris'
}

export const formatearFechaLocal = (fechaString: string) => {
  if (!fechaString) return ''
  const fechaUtc = fechaString.endsWith('Z') ? fechaString : `${fechaString}Z`
  return new Date(fechaUtc).toLocaleString('es-MX')
}