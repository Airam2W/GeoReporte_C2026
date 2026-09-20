// logic/panelAdministrador.ts

/**
 * Trunca un texto a un límite de caracteres y agrega "..." si excede.
 */
export const truncarTexto = (texto: string, limite: number): string => {
  if (!texto) return ''
  return texto.length > limite ? texto.slice(0, limite) + '...' : texto
}

/**
 * Devuelve la clase CSS correspondiente al estado del reporte.
 */
export const obtenerClaseEstado = (estado: string): string => {
  const clases: Record<string, string> = {
    llegado: 'badge-azul',
    'en proceso': 'badge-amarillo',
    finalizado: 'badge-verde',
    rechazado: 'badge-rojo',
    turnado: 'badge-purpura'
  }
  return clases[estado] || 'badge-gris'
}
