

export const obtenerClaseEstado = (estado: string) => {
  const clases: Record<string, string> = {
    pendiente: 'badge-azul',
    'en revisión': 'badge-amarillo',
    finalizado: 'badge-verde',
    rechazado: 'badge-rojo',
    turnado: 'badge-purpura',
    'devuelto': 'badge-naranja',
    'en proceso': 'badge-teal',
    'pendiente de finalización': 'badge-rosa',
  }
  return clases[estado] || 'badge-gris'
}

export const traducirEstado = (estado: string) => {
  const traducciones: Record<string, string> = {
    pendiente: 'Pendiente',
    'en revisión': 'En Revisión',
    finalizado: 'Finalizado',
    rechazado: 'Rechazado',
    turnado: 'En Revisión',
    'Devuelto': 'En Revisión',
    'En Proceso': 'En Proceso',
    'Pendiente de Finalización': 'En Proceso',
  }
  return traducciones[estado] || estado
}

export const formatearFechaLocal = (fechaString: string) => {
  if (!fechaString) return ''
  const fechaUtc = fechaString.endsWith('Z') ? fechaString : `${fechaString}Z`
  return new Date(fechaUtc).toLocaleString('es-MX')
}

export const formatearFecha = (fechaString: string) => {
  if (!fechaString) return ''
  const fechaUtc = fechaString.endsWith('Z') ? fechaString : `${fechaString}Z`
  return new Date(fechaUtc).toLocaleDateString('es-MX')
}
