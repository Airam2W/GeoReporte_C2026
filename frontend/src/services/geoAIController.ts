export const API_URL = import.meta.env.VITE_AI_BACKEND_URL
// export const API_URL = 'http://localhost:8000'


// Interfaz actualizada para incluir el campo 'type' que envuelve el backend
interface RespuestaAI {
  success: boolean
  data: {
    message: string | null
  }
  error: string | null
  type: number // 0 = Pasa, 1 = No pasa, 2 = Error
}

// Método asíncrono para enviar la imagen
export const validarAI = async (imageFile: File, depto: string): Promise<RespuestaAI | void> => {
  try {
    const formData = new FormData()
    formData.append('file', imageFile)

    const response = await fetch(`${API_URL}/validarAI/${depto}`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Error en la petición: ${response.statusText}`)
    }

    const resultado: RespuestaAI = await response.json()

    // Puedes evaluar el tipo de respuesta directamente aquí o en tu componente de Vue
    console.log('Respuesta completa:', resultado)
    console.log('Código de validación (type):', resultado.type)

    return resultado

  } catch (error) {
    console.error('Fallo al conectar con el servidor de Python:', error)
  }
}
