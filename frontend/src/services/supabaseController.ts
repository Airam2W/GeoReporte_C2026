export const API_URL = import.meta.env.VITE_BACKEND_URL // URL del servidor en Render

interface UserSession {
  id: string
  nombre: string
  estado: string
  [key: string]: any
}

const userSession = localStorage.getItem('userSession') || null
let usuarioObjeto = typeof userSession === 'string' ? JSON.parse(userSession) : userSession;

// Función que espera de forma asíncrona a que exista usuarioObjeto
export const esperarUsuario = (timeoutMs = 3000): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Si ya existe inmediatamente, lo devolvemos
    if (usuarioObjeto) {
      return resolve(usuarioObjeto);
    }

    const intervalo = 50; // Revisa cada 50ms
    let tiempoTranscurrido = 0;

    const timer = setInterval(() => {
      // Intentamos refrescar desde el localStorage por si acaso
      const sessionString = localStorage.getItem('userSession');
      if (sessionString) {
        try {
          usuarioObjeto = JSON.parse(sessionString);
        } catch (e) {
          usuarioObjeto = null;
        }
      }

      if (usuarioObjeto) {
        clearInterval(timer);
        resolve(usuarioObjeto);
      } else {
        tiempoTranscurrido += intervalo;
        if (tiempoTranscurrido >= timeoutMs) {
          clearInterval(timer);
          reject(new Error('Timeout: El usuario no ha iniciado sesión o tardó demasiado en cargarse.'));
        }
      }
    }, intervalo);
  });
}

// Helper para llamadas — nunca lanza excepción, siempre devuelve { data, error }
async function request(path: string, options: RequestInit = {}) {
  try {
    // 1. Esperamos a que usuarioObjeto exista (pausa la ejecución unos milisegundos si viene en null)
    //await esperarUsuario(2000).catch(() => null); // Espera máx 2 segundos

    // 2. Una vez asegurado (o si pasó el tiempo), leemos la sesión más fresca
    const sessionString = localStorage.getItem('userSession');
    usuarioObjeto = sessionString ? JSON.parse(sessionString) : null;

    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    const result = await res.json()
    // El backend ya responde siempre como { data, error }
    return result
  } catch (err: any) {
    return { data: null, error: { message: err?.message || 'Error de red' } }
  }
}

// ------------------ Consultas ------------------

export async function obtenerTodosDepartamentosInternos() {//NUEVO
  return request(`/obtener/departamentos_internos`, {
    method: 'POST',
    body: JSON.stringify({ user: usuarioObjeto }),
  })
}

export async function obtenerTodosDepartamentosExternos() {//NUEVO
  return request(`/obtener/departamentos_externos`, {
    method: 'POST',
    body: JSON.stringify({ user: usuarioObjeto }),
  })
}

export async function obtenerTodosProblemasInternos() {//NUEVO
  return request(`/obtener/problemas_internos`, {
    method: 'POST',
    body: JSON.stringify({ user: usuarioObjeto }),
  })
}

export async function obtenerTodosProblemasExternos() {//NUEVO
  return request(`/obtener/problemas_externos`, {
    method: 'POST',
    body: JSON.stringify({ user: usuarioObjeto }),
  })
}

export async function obtenerTodosSupervisores() {//NUEVO
  return request(`/obtener/supervisores`, {
    method: 'POST',
    body: JSON.stringify({ user: usuarioObjeto }),
  })
}

export async function obtenerTodosJefes() {//NUEVO
  return request(`/obtener/jefes`, {
    method: 'POST',
    body: JSON.stringify({ user: usuarioObjeto }),
  })
}

export async function obtenerUsuarioExcepto(tipousuario_id: number) {//NUEVO
  return request(`/obtener/usuarios/excepto`, {
    method: 'POST',
    body: JSON.stringify({ valor: tipousuario_id, user: usuarioObjeto }),
  })
}

export async function obtenerTodosUsuariosExcepto(tipousuario_id: number) {//NUEVO
  return request(`/obtener/usuariosTodos/excepto`, {
    method: 'POST',
    body: JSON.stringify({ valor: tipousuario_id, user: usuarioObjeto }),
  })
}

export async function obtenerDepartamentosinternosPorNombre(nombre: string) {//NUEVO
  return request(`/obtener/departamentos_internos/nombre`, {
    method: 'POST',
    body: JSON.stringify({ valor: nombre, user: usuarioObjeto }),
  })
}
export async function obtenerDepartamentosExternosPorNombre(nombre: string) {//NUEVO
  return request(`/obtener/departamentos_externos/nombre`, {
    method: 'POST',
    body: JSON.stringify({ valor: nombre, user: usuarioObjeto }),
  })
}
export async function obtenerProblematicasInternasPorNombre(nombre: string) {//NUEVO
  return request(`/obtener/problematicas_internas/nombre`, {
    method: 'POST',
    body: JSON.stringify({ valor: nombre, user: usuarioObjeto }),
  })
}
export async function obtenerProblematicasExternasPorNombre(nombre: string) {//NUEVO
  return request(`/obtener/problematicas_externas/nombre`, {
    method: 'POST',
    body: JSON.stringify({ valor: nombre, user: usuarioObjeto }),
  })
}

export async function obtenerCorreoUnico(correo: string) {//NUEVO
  return request(`/obtener/usuarios/correoUnico`, {
    method: 'POST',
    body: JSON.stringify({ valor: correo, user: usuarioObjeto }),
  })
}

export async function obtenerReportePorFolio(folio: string) {//NUEVO
  return request(`/obtener/reportes/folio`, {
    method: 'POST',
    body: JSON.stringify({ valor: folio }),
  })
}

export async function obtenerEstadoIDPorNombre(estado: string) {//NUEVO
  return request(`/obtener/estadoId/nombre`, {
    method: 'POST',
    body: JSON.stringify({ valor: estado, user: usuarioObjeto}),
  })
}


export async function obtenerProblematicasInternasPorID(depId: number | string) {//NUEVO
  return request(`/obtener/problematicas_internas/id`, {
    method: 'POST',
    body: JSON.stringify({ valor: depId, user: usuarioObjeto }),
  })
}

export async function obtenerProblematicasExternasPorID(depId: number | string) {//NUEVO

  return request(`/obtener/problematicas_externas/id`, {
    method: 'POST',
    body: JSON.stringify({ valor: depId, user: usuarioObjeto }),
  })
}

export async function obtenerDepartamentosExternosPorID(depId: number | string) {//NUEVO

  return request(`/obtener/departamentos_externos/id`, {
    method: 'POST',
    body: JSON.stringify({ valor: depId, user: usuarioObjeto }),
  })
}

export async function obtenerDepartamentosInternosPorID(depId: number | string) {//NUEVO
  return request(`/obtener/departamentos_internos/id`, {
    method: 'POST',
    body: JSON.stringify({ valor: depId, user: usuarioObjeto }),
  })
}

export async function obtenerAdministradoresInternosPorID(depId: number | string) {//NUEVO
  return request(`/obtener/administradores_internos/id`, {
    method: 'POST',
    body: JSON.stringify({ valor: depId, user: usuarioObjeto }),
  })
}

export async function obtenerAdministradoresExternosPorID(depId: number | string) {//NUEVO
  return request(`/obtener/administradores_externos/id`, {
    method: 'POST',
    body: JSON.stringify({ valor: depId, user: usuarioObjeto }),
  })
}

export async function obtenerSupervisorIDPorUsuarioID(usuarioId: number | string) {//NUEVO
  return request(`/obtener/supervisores/usuarioID`, {
    method: 'POST',
    body: JSON.stringify({ valor: usuarioId }),
  })
}

export async function obtenerSupervisoresPorDepartamentoID(depId: number | string) {//NUEVO
  return request(`/obtener/supervisores/departamentoId`, {
    method: 'POST',
    body: JSON.stringify({ valor: depId, user: usuarioObjeto }),
  })
}


export async function obtenerJefeIDPorUsuarioID(usuarioId: number | string) {//NUEVO
  return request(`/obtener/jefes/usuarioID`, {
    method: 'POST',
    body: JSON.stringify({ valor: usuarioId }),
  })
}

export async function obtenerTitulos(categoria_historial_id: number | string) {//NUEVO
  return request(`/obtener/titulos/categoria_historial_id`, {
    method: 'POST',
    body: JSON.stringify({ valor: categoria_historial_id, user: usuarioObjeto }),
  })
}

export async function obtenerCategoriaHistorial(categoria_historial_id: number | string) {//NUEVO
  return request(`/obtener/categoria_historial/id`, {
    method: 'POST',
    body: JSON.stringify({ valor: categoria_historial_id, user: usuarioObjeto }),
  })
}

export async function actualizarEstadoReporte(folio: string, data: any) {//NUEVO
  return request(`/actualizar/reporte/estadoId`, {
    method: 'PUT',
    body: JSON.stringify({ folio, data, user: usuarioObjeto }),
  })
}

export async function actualizarEstadoReporteConJefeFechaInicio(folio: string, data: any) {//NUEVO
  return request(`/actualizar/reporte/estadoIdJefeFechaInicio`, {
    method: 'PUT',
    body: JSON.stringify({ folio, data, user: usuarioObjeto }),
  })
}

export async function actualizarEstadoReporteConFechaCierre(folio: string, data: any) {//NUEVO
  return request(`/actualizar/reporte/estadoIdFechaCierre`, {
    method: 'PUT',
    body: JSON.stringify({ folio, data, user: usuarioObjeto }),
  })
}

export async function actualizarEstadoReporteQuitarSupervisor(folio: string, data: any) {//NUEVO
  return request(`/actualizar/reporte/estadoIdSupervisorNull`, {
    method: 'PUT',
    body: JSON.stringify({ folio, data, user: usuarioObjeto }),
  })
}

export async function actualizarEstadoProblemaInterno(data: any) {//NUEVO
  return request(`/actualizar/problema_interno/estado`, {
    method: 'PUT',
    body: JSON.stringify({ data, user: usuarioObjeto }),
  })
}

export async function actualizarEstadoProblemaExterno(data: any) {//NUEVO
  return request(`/actualizar/problema_externo/estado`, {
    method: 'PUT',
    body: JSON.stringify({ data, user: usuarioObjeto }),
  })
}

export async function actualizarSupervisorEstadoReporte(folio: string, data: any) {//NUEVO
  return request(`/actualizar/reporteEstado/supervisor`, {
    method: 'PUT',
    body: JSON.stringify({ folio, data, user: usuarioObjeto }),
  })
}

export async function actualizarProblemaInterno(id: number | string, data: any) {//NUEVO
  return request(`/actualizar/problema_interno`, {
    method: 'PUT',
    body: JSON.stringify({ id, data, user: usuarioObjeto }),
  })
}

export async function actualizarProblemaExterno(id: number | string, data: any) {//NUEVO
  return request(`/actualizar/problema_externo`, {
    method: 'PUT',
    body: JSON.stringify({ id, data, user: usuarioObjeto }),
  })
}

export async function actualizarDepartamentoInterno(id: number | string, data: any) {//NUEVO
  return request(`/actualizar/departamento_interno`, {
    method: 'PUT',
    body: JSON.stringify({ id, data, user: usuarioObjeto }),
  })
}

export async function actualizarDepartamentoExterno(id: number | string, data: any) {//NUEVO
  return request(`/actualizar/departamento_externo`, {
    method: 'PUT',
    body: JSON.stringify({ id, data, user: usuarioObjeto }),
  })
}

export async function actualizarEstadoDepartamentoInterno(id: number | string, data: any) {//NUEVO
  return request(`/actualizar/departamento_interno/estado`, {
    method: 'PUT',
    body: JSON.stringify({ id, data, user: usuarioObjeto }),
  })
}

export async function actualizarEstadoDepartamentoExterno(id: number | string, data: any) {//NUEVO
  return request(`/actualizar/departamento_externo/estado`, {
    method: 'PUT',
    body: JSON.stringify({ id, data, user: usuarioObjeto }),
  })
}

export async function actualizarEstadoUsuario(id: number | string, data: any) {//NUEVO
  return request(`/actualizar/usuario/estado`, {
    method: 'PUT',
    body: JSON.stringify({ id, data, user: usuarioObjeto }),
  })
}

export async function actualizarFechaBajaUsuario(id: number | string, data: any) {//NUEVO
  return request(`/actualizar/usuario/fechaBaja`, {
    method: 'PUT',
    body: JSON.stringify({ id, data, user: usuarioObjeto }),
  })
}

export async function actualizarFechaAltaUsuario(id: number | string, data: any) {//NUEVO
  return request(`/actualizar/usuario/fechaAlta`, {
    method: 'PUT',
    body: JSON.stringify({ id, data, user: usuarioObjeto }),
  })
}

export async function obtenerUsuarioPorCorreoYContrasena(params: any) {//NUEVO
  return request(`/obtener/usuarios/CorreoContrasena`, {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function guardarUsuario(data: any) {//NUEVO
  return request(`/guardar/usuario`, {
    method: 'POST',
    body: JSON.stringify({ data, user: usuarioObjeto }),
  })
}

export async function crearReporte(data: any) {//NUEVO
  return request(`/crear/reporte`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function crearDetalleReporte(data: any) {//NUEVO
  return request(`/crear/detalleReporte`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function crearHistorialReporte(folio: string, data: any) {//NUEVO
  return request(`/crear/historialReporte`, {
    method: 'POST',
    body: JSON.stringify({ folio, data, user: usuarioObjeto }),
  })
}

export async function crearHistorialReporteConFoto(folio: string, data: any) {//NUEVO
  return request(`/crear/historialReporteConFoto`, {
    method: 'POST',
    body: JSON.stringify({ folio, data, user: usuarioObjeto }),
  })
}

export async function crearProblemaInterno(data: any) {//NUEVO
  return request(`/crear/problema_interno`, {
    method: 'POST',
    body: JSON.stringify({ data, user: usuarioObjeto }),
  })
}

export async function crearProblemaExterno(data: any) {//NUEVO
  return request(`/crear/problema_externo`, {
    method: 'POST',
    body: JSON.stringify({ data, user: usuarioObjeto }),
  })
}

export async function crearDepartamentoInterno(data: any) {//NUEVO
  return request(`/crear/departamento_interno`, {
    method: 'POST',
    body: JSON.stringify({ data, user: usuarioObjeto }),
  })
}

export async function crearDepartamentoExterno(data: any) {//NUEVO
  return request(`/crear/departamento_externo`, {
    method: 'POST',
    body: JSON.stringify({ data, user: usuarioObjeto }),
  })
}

export async function eliminarProblemaInterno(id: number | string) {//NUEVO
  return request(`/eliminar/problema_interno`, {
    method: 'DELETE',
    body: JSON.stringify({ id, user: usuarioObjeto }),
  })
}

export async function eliminarProblemaExterno(id: number | string) {//NUEVO
  return request(`/eliminar/problema_externo`, {
    method: 'DELETE',
    body: JSON.stringify({ id, user: usuarioObjeto }),
  })
}

export async function eliminarDepartamentoInterno(id: number | string) {//NUEVO
  return request(`/eliminar/departamento_interno`, {
    method: 'DELETE',
    body: JSON.stringify({ id, user: usuarioObjeto }),
  })
}

export async function eliminarDepartamentoExterno(id: number | string) {//NUEVO
  return request(`/eliminar/departamento_externo`, {
    method: 'DELETE',
    body: JSON.stringify({ id, user: usuarioObjeto }),
  })
}

export async function obtenerDepartamentosOrdenadosPorId() {
  return request(`/obtener/departamentos/ordenadosPorId`, {
    method: 'GET',
  })
}

export async function obtenerProblemasPorDepartamentoID(depId: number | string) {//NUEVO
  return request(`/obtener/problemas/departamentoId`, {
    method: 'POST',
    body: JSON.stringify({ valor: depId }),
  })
}

export async function obtenerReportesPorDepartamentoExternoID(depId: number | string) {//NUEVO
  return request(`/obtener/reportes/departamento_externo_Id`, {
    method: 'POST',
    body: JSON.stringify({ valor: depId, user: usuarioObjeto }),
  })
}

export async function obtenerReportesPorDepartamentoInternoID(depId: number | string) {//NUEVO
  return request(`/obtener/reportes/departamento_interno_Id`, {
    method: 'POST',
    body: JSON.stringify({ valor: depId, user: usuarioObjeto }),
  })
}

export async function obtenerReportesJefe(depId: number | string) {//NUEVO
  return request(`/obtener/reportes/jefe`, {
    method: 'POST',
    body: JSON.stringify({ valor: depId, user: usuarioObjeto }),
  })
}

export async function obtenerReportesSupervisor(depId: number | string) {//NUEVO
  return request(`/obtener/reportes/supervisor`, {
    method: 'POST',
    body: JSON.stringify({ valor: depId, user: usuarioObjeto }),
  })
}

export async function obtenerJefesPorSupervisor(supervisorId: number | string) {//NUEVO
  return request(`/obtener/jefes/supervisorId`, {
    method: 'POST',
    body: JSON.stringify({ valor: supervisorId, user: usuarioObjeto }),
  })
}

export async function actualizarReporteADepartamentoInterno(folio: string, departamento_id: number | string, problema_id: number | string) {//NUEVO
  return request(`/actualizar/reporte/departamento_interno`, {
    method: 'PUT',
    body: JSON.stringify({ folio, departamento_id, problema_id, user: usuarioObjeto }),
  })
}

export async function actualizarReporteADepartamentoExterno(folio: string, departamento_id: number | string, problema_id: number | string) {//NUEVO
  return request(`/actualizar/reporte/departamento_externo`, {
    method: 'PUT',
    body: JSON.stringify({ folio, departamento_id, problema_id, user: usuarioObjeto }),
  })
}

// ------------------ Storage ------------------

export async function uploadFoto(filePath: string, file: File, bucket = 'fotos') {
  const formData = new FormData()
  formData.append('filePath', filePath)
  formData.append('file', file)

  try {
    const res = await fetch(`${API_URL}/storage/${bucket}/upload`, {
      method: 'POST',
      body: formData,
    })
    return await res.json()
  } catch (err: any) {
    return { data: null, error: { message: err?.message || 'Error de red' } }
  }
}

export async function getPublicUrl(filePath: string, bucket = 'fotos') {// NO BORRAR
  return request(`/storage/${bucket}/publicUrl`, {
    method: 'POST',
    body: JSON.stringify({ filePath }),
  })
}