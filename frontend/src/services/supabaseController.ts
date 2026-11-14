// ================== VARIABLES GLOBALES ==================
export const API_URL = import.meta.env.VITE_BACKEND_URL // URL del servidor en Render

import router from '../router/index.ts'

// Guardamos solo el estado del Token
let usuarioToken: string | null = localStorage.getItem('userToken') || null;

// ================== FUNCIONES AUXILIARES ==================
// Nueva función: Ahora espera de forma asíncrona a que el TOKEN exista
export const esperarUsuario = (timeoutMs = 3000): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Si ya existe el token inmediatamente, lo devolvemos
    if (usuarioToken) {
      return resolve(usuarioToken);
    }

    const intervalo = 50; 
    let tiempoTranscurrido = 0;

    const timer = setInterval(() => {
      // Intentamos refrescar desde el localStorage por si la sesión se acaba de guardar
      const tokenString = localStorage.getItem('userToken');
      
      if (tokenString) {
        usuarioToken = tokenString;
        clearInterval(timer);
        resolve(usuarioToken);
      } else {
        tiempoTranscurrido += intervalo;
        if (tiempoTranscurrido >= timeoutMs) {
          clearInterval(timer);
          reject(new Error('Timeout: El token de autenticación no se encontró o tardó demasiado.'));
        }
      }
    }, intervalo);
  });
}
// Helper para llamadas — nunca lanza excepción, siempre devuelve { data, error }
async function request(path: string, options: RequestInit = {}) {
  try {
    // 1. Pausa la ejecución hasta asegurar que el token ya esté disponible (máx 2 segundos)
    // Nota: Descoméntalo si haces peticiones críticas justo al renderizar la app por primera vez
    // await esperarToken(2000).catch(() => null); 

    // 2. Traemos el token más fresco del almacenamiento
    usuarioToken = localStorage.getItem('userToken');

    // 3. Configuramos los headers dinámicamente
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (usuarioToken) {
      headers['Authorization'] = `Bearer ${usuarioToken}`;
    }

    // 4. Realizamos el fetch
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
    
    const result = await res.json();

    // Si el token expiró o no es válido (HTTP 401), limpia el almacenamiento y expulsa al usuario
    if (res.status === 401 || (result?.error && (result.error.message?.includes('expirado') || result.error.message?.includes('expired')))) {
      localStorage.removeItem('userToken');
      router.push('/');
    }

    return result;
    
  } catch (err: any) {
    return { data: null, error: { message: err?.message || 'Error de red' } };
  }
}



// ================== GET ==================

export async function obtenerTodosDepartamentosInternos() {//NUEVO
  return request(`/departamentos_internos`, {
    method: 'GET',
  })
}

export async function obtenerTodosDepartamentosExternos() {//NUEVO
  return request(`/departamentos_externos`, {
    method: 'GET',
  })
}

export async function obtenerTodosProblemasInternos() {//NUEVO
  return request(`/problemas_internos`, {
    method: 'GET',
  })
}

export async function obtenerTodosProblemasExternos() {//NUEVO
  return request(`/problemas_externos`, {
    method: 'GET',
  })
}

export async function obtenerTodosSupervisores() {//NUEVO
  return request(`/supervisores`, {
    method: 'GET',
  })
}

export async function obtenerTodosJefes() {//NUEVO
  return request(`/jefes`, {
    method: 'GET',
  })
}

export async function obtenerReportesMapa() {
  return request(`/reportes/mapa`, {
    method: 'GET',
  })
}

export async function obtenerHistorial(params: {
  pagina?: number
  limite?: number
  busqueda?: string
  accion?: string
  entidad?: string
  fechaDesde?: string
  fechaHasta?: string
}) {
  const queryParams = new URLSearchParams()
  if (params.pagina !== undefined) queryParams.append('pagina', String(params.pagina))
  if (params.limite !== undefined) queryParams.append('limite', String(params.limite))
  if (params.busqueda) queryParams.append('busqueda', params.busqueda)
  if (params.accion) queryParams.append('accion', params.accion)
  if (params.entidad) queryParams.append('entidad', params.entidad)
  if (params.fechaDesde) queryParams.append('fechaDesde', params.fechaDesde)
  if (params.fechaHasta) queryParams.append('fechaHasta', params.fechaHasta)

  return request(`/historial?${queryParams.toString()}`, {
    method: 'GET',
  })
}

export async function obtenerUsuarioExcepto(tipousuario_id: number) {//NUEVO
  return request(`/usuarios/excepto?${new URLSearchParams({ valor: String(tipousuario_id) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerTodosUsuariosExcepto(tipousuario_id: number) {//NUEVO
  return request(`/usuariosTodos/excepto?${new URLSearchParams({ valor: String(tipousuario_id) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerDepartamentosinternosPorNombre(nombre: string) {//NUEVO
  return request(`/departamentos_internos/nombre?${new URLSearchParams({ valor: String(nombre) }).toString()}`, {
    method: 'GET',
  })
}
export async function obtenerDepartamentosExternosPorNombre(nombre: string) {//NUEVO
  return request(`/departamentos_externos/nombre?${new URLSearchParams({ valor: String(nombre) }).toString()}`, {
    method: 'GET',
  })
}
export async function obtenerProblematicasInternasPorNombre(nombre: string) {//NUEVO
  return request(`/problematicas_internas/nombre?${new URLSearchParams({ valor: String(nombre) }).toString()}`, {
    method: 'GET',
  })
}
export async function obtenerProblematicasExternasPorNombre(nombre: string) {//NUEVO
  return request(`/problematicas_externas/nombre?${new URLSearchParams({ valor: String(nombre) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerCorreoUnico(correo: string, id: number | string) {//NUEVO
  return request(`/usuarios/correoUnico?${new URLSearchParams({ valor: String(correo), id: String(id) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerReportePorFolio(folio: string) {//NUEVO
  return request(`/reportes/folio?${new URLSearchParams({ valor: String(folio) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerEstadoIDPorNombre(estado: string) {//NUEVO
  return request(`/estadoId/nombre?${new URLSearchParams({ valor: String(estado) }).toString()}`, {
    method: 'GET',
  })
}


export async function obtenerProblematicasInternasPorID(depId: number | string) {//NUEVO
  return request(`/problematicas_internas/id?${new URLSearchParams({ valor: String(depId) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerProblematicasExternasPorID(depId: number | string) {//NUEVO

  return request(`/problematicas_externas/id?${new URLSearchParams({ valor: String(depId) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerDepartamentosExternosPorID(depId: number | string) {//NUEVO

  return request(`/departamentos_externos/id?${new URLSearchParams({ valor: String(depId) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerDepartamentosInternosPorID(depId: number | string) {//NUEVO
  return request(`/departamentos_internos/id?${new URLSearchParams({ valor: String(depId) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerAdministradoresInternosPorID(depId: number | string) {//NUEVO
  return request(`/administradores_internos/id?${new URLSearchParams({ valor: String(depId) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerAdministradoresExternosPorID(depId: number | string) {//NUEVO
  return request(`/administradores_externos/id?${new URLSearchParams({ valor: String(depId) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerSupervisorIDPorUsuarioID(usuarioId: number | string) {//NUEVO
  return request(`/supervisores/usuarioID?${new URLSearchParams({ valor: String(usuarioId) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerSupervisoresPorDepartamentoID(depId: number | string) {//NUEVO
  return request(`/supervisores/departamentoId?${new URLSearchParams({ valor: String(depId) }).toString()}`, {
    method: 'GET',
  })
}


export async function obtenerJefeIDPorUsuarioID(usuarioId: number | string) {//NUEVO
  return request(`/jefes/usuarioID?${new URLSearchParams({ valor: String(usuarioId) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerTitulos(categoria_historial_id: number | string) {//NUEVO
  return request(`/titulos/categoria_historial_id?${new URLSearchParams({ valor: String(categoria_historial_id) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerCategoriaHistorial(categoria_historial_id: number | string) {//NUEVO
  return request(`/categoria_historial/id?${new URLSearchParams({ valor: String(categoria_historial_id) }).toString()}`, {
    method: 'GET',
  })
}

// ================== PUT ==================
export async function actualizarEstadoReporte(folio: string, data: any) {//NUEVO
  return request(`/reporte/estadoId`, {
    method: 'PUT',
    body: JSON.stringify({ folio, data }),
  })
}

export async function actualizarEstadoReporteConJefeFechaInicio(folio: string, data: any) {//NUEVO
  return request(`/reporte/estadoIdJefeFechaInicio`, {
    method: 'PUT',
    body: JSON.stringify({ folio, data }),
  })
}

export async function actualizarEstadoReporteConFechaCierre(folio: string, data: any) {//NUEVO
  return request(`/reporte/estadoIdFechaCierre`, {
    method: 'PUT',
    body: JSON.stringify({ folio, data }),
  })
}

export async function actualizarEstadoReporteQuitarSupervisor(folio: string, data: any) {//NUEVO
  return request(`/reporte/estadoIdSupervisorNull`, {
    method: 'PUT',
    body: JSON.stringify({ folio, data }),
  })
}

export async function actualizarEstadoProblemaInterno(data: any) {//NUEVO
  return request(`/problema_interno/estado`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  })
}

export async function actualizarEstadoProblemaExterno(data: any) {//NUEVO
  return request(`/problema_externo/estado`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  })
}

export async function actualizarSupervisorEstadoReporte(folio: string, data: any) {//NUEVO
  return request(`/reporteEstado/supervisor`, {
    method: 'PUT',
    body: JSON.stringify({ folio, data }),
  })
}

export async function actualizarProblemaInterno(id: number | string, data: any) {//NUEVO
  return request(`/problema_interno`, {
    method: 'PUT',
    body: JSON.stringify({ id, data }),
  })
}

export async function actualizarProblemaExterno(id: number | string, data: any) {//NUEVO
  return request(`/problema_externo`, {
    method: 'PUT',
    body: JSON.stringify({ id, data }),
  })
}

export async function actualizarDepartamentoInterno(id: number | string, data: any) {//NUEVO
  return request(`/departamento_interno`, {
    method: 'PUT',
    body: JSON.stringify({ id, data }),
  })
}

export async function actualizarDepartamentoExterno(id: number | string, data: any) {//NUEVO
  return request(`/departamento_externo`, {
    method: 'PUT',
    body: JSON.stringify({ id, data }),
  })
}

export async function actualizarEstadoDepartamentoInterno(id: number | string, data: any) {//NUEVO
  return request(`/departamento_interno/estado`, {
    method: 'PUT',
    body: JSON.stringify({ id, data }),
  })
}

export async function actualizarEstadoDepartamentoExterno(id: number | string, data: any) {//NUEVO
  return request(`/departamento_externo/estado`, {
    method: 'PUT',
    body: JSON.stringify({ id, data }),
  })
}

export async function actualizarEstadoUsuario(id: number | string, data: any) {//NUEVO
  return request(`/usuario/estado`, {
    method: 'PUT',
    body: JSON.stringify({ id, data }),
  })
}

export async function actualizarFechaBajaUsuario(id: number | string, data: any) {//NUEVO
  return request(`/usuario/fechaBaja`, {
    method: 'PUT',
    body: JSON.stringify({ id, data }),
  })
}

export async function actualizarFechaAltaUsuario(id: number | string, data: any) {//NUEVO
  return request(`/usuario/fechaAlta`, {
    method: 'PUT',
    body: JSON.stringify({ id, data }),
  })
}

export async function actualizarFotoDepartamentoReporte(folio: string, fotoDepartamentoID: number) {
  return request(`/reporte/fotoDepartamentoID`, {
    method: 'PUT',
    body: JSON.stringify({ folio, fotoDepartamentoID }),
  })
}

// ================== POST ==================

export async function agregarHistorial(data: any) {
  return request(`/historial`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  })
}

export async function obtenerUsuarioPorCorreoYContrasena(params: {
  p_correo: string
  p_contrasena: string
}) {
  return request(`/usuarios/CorreoContrasena`, {
    method: 'POST',
    body: JSON.stringify({
      p_correo: params.p_correo,
      p_contrasena: params.p_contrasena,
    }),
  })
}

export async function guardarUsuario(data: any) {//NUEVO
  return request(`/usuario`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  })
}

export async function crearReporte(data: any) {//NUEVO
  return request(`/reporte`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function crearDetalleReporte(data: any) {//NUEVO
  return request(`/detalleReporte`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function crearHistorialReporte(folio: string, data: any) {//NUEVO
  return request(`/historialReporte`, {
    method: 'POST',
    body: JSON.stringify({ folio, data }),
  })
}

export async function crearHistorialReporteConFoto(folio: string, data: any) {//NUEVO
  return request(`/historialReporteConFoto`, {
    method: 'POST',
    body: JSON.stringify({ folio, data }),
  })
}

export async function crearProblemaInterno(data: any) {//NUEVO
  return request(`/problema_interno`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  })
}

export async function crearProblemaExterno(data: any) {//NUEVO
  return request(`/problema_externo`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  })
}

export async function crearDepartamentoInterno(data: any) {//NUEVO
  return request(`/departamento_interno`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  })
}

export async function crearDepartamentoExterno(data: any) {//NUEVO
  return request(`/departamento_externo`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  })
}

// ================== DELETE ==================
export async function eliminarProblemaInterno(id: number | string) {//NUEVO
  return request(`/problema_interno`, {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  })
}

export async function eliminarProblemaExterno(id: number | string) {//NUEVO
  return request(`/problema_externo`, {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  })
}

export async function eliminarDepartamentoInterno(id: number | string) {//NUEVO
  return request(`/departamento_interno`, {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  })
}

export async function eliminarDepartamentoExterno(id: number | string) {//NUEVO
  return request(`/departamento_externo`, {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  })
}

export async function obtenerDepartamentosOrdenadosPorId() {
  return request(`/departamentos/ordenadosPorId`, {
    method: 'GET',
  })
}

export async function obtenerProblemasPorDepartamentoID(depId: number | string) {//NUEVO
  return request(`/problemas/departamentoId?${new URLSearchParams({ valor: String(depId) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerReportesPorDepartamentoExternoID(depId: number | string) {//NUEVO
  return request(`/reportes/departamento_externo_Id?${new URLSearchParams({ valor: String(depId) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerReportesPorDepartamentoInternoID(depId: number | string) {//NUEVO
  return request(`/reportes/departamento_interno_Id?${new URLSearchParams({ valor: String(depId) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerReportesJefe(depId: number | string) {//NUEVO
  return request(`/reportes/jefe?${new URLSearchParams({ valor: String(depId) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerReportesSupervisor(depId: number | string) {//NUEVO
  return request(`/reportes/supervisor?${new URLSearchParams({ valor: String(depId) }).toString()}`, {
    method: 'GET',
  })
}

export async function obtenerJefesPorSupervisor(supervisorId: number | string) {//NUEVO
  return request(`/jefes/supervisorId?${new URLSearchParams({ valor: String(supervisorId) }).toString()}`, {
    method: 'GET',
  })
}

export async function actualizarReporteADepartamentoInterno(folio: string, departamento_id: number | string, problema_id: number | string) {//NUEVO
  return request(`/reporte/departamento_interno`, {
    method: 'PUT',
    body: JSON.stringify({ folio, departamento_id, problema_id }),
  })
}

export async function actualizarReporteADepartamentoExterno(folio: string, departamento_id: number | string, problema_id: number | string) {//NUEVO
  return request(`/reporte/departamento_externo`, {
    method: 'PUT',
    body: JSON.stringify({ folio, departamento_id, problema_id }),
  })
}

// ================== STORAGE ==================

export async function uploadFoto(filePath: string, file: File, bucket = 'fotos') {
  const formData = new FormData()
  formData.append('filePath', filePath)
  formData.append('file', file)
  
  try {
    const token = localStorage.getItem('userToken')

    const headers: HeadersInit = {}

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_URL}/storage/${bucket}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })

    const result = await res.json()
    return result
  } catch (err: any) {
    return {
      data: null,
      error: { message: err?.message || 'Error de red' },
    }
  }
}

export async function getPublicUrl(filePath: string, bucket = 'fotos') {// NO BORRAR
  return request(`/storage/${bucket}/publicUrl`, {
    method: 'POST',
    body: JSON.stringify({ filePath }),
  })
}