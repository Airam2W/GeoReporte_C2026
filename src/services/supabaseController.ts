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

export async function selectAll(tabla: string, columnas: string[] = ['*']) {
  return request(`/select/${tabla}`, {
    method: 'POST',
    body: JSON.stringify({ columnas }),
  })
}

export async function selectNeq(
  tabla: string,
  campo: string,
  valor: any,
  columnas: string[] = ['*'],
) {
  return request(`/select/${tabla}/neq`, {
    method: 'POST',
    body: JSON.stringify({ campo, valor, columnas }),
  })
}

export async function selectNeqOrder(
  tabla: string,
  campo: string,
  valor: any,
  orderBy: string,
  columnas: string[] = ['*'],
  ascending: boolean = true,
) {
  return request(`/select/${tabla}/neq/order`, {
    method: 'POST',
    body: JSON.stringify({ campo, valor, orderBy, columnas, ascending }),
  })
}

export async function deleteEq(tabla: string, campo: string, valor: any) {
  return request(`/delete/${tabla}/eq`, {
    method: 'DELETE',
    body: JSON.stringify({ campo, valor }),
  })
}

export async function selectIlike(//BORRAR
  tabla: string,
  campo: string,
  valor: string,
  columnas: string[] = ['*'],
) {
  return request(`/select/${tabla}/ilike`, {
    method: 'POST',
    body: JSON.stringify({ campo, valor, columnas }),
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



export async function selectIlikeMaybeSingle(tabla: string, campo: string, valor: string) {//BORRAR
  return request(`/select/${tabla}/ilike/maybeSingle`, {
    method: 'POST',
    body: JSON.stringify({ campo, valor }),
  })
}

export async function obtenerCorreoUnico(correo: string) {//NUEVO
  return request(`/obtener/usuarios/correoUnico`, {
    method: 'POST',
    body: JSON.stringify({ valor: correo, user: usuarioObjeto }),
  })
}

export async function selectEqSingle(//BORRAR
  tabla: string,
  campo: string,
  valor: any,
  columnas: string[] = ['*'],
) {
  return request(`/select/${tabla}/eq/single`, {
    method: 'POST',
    body: JSON.stringify({ campo, valor, columnas }),
  })
}

export async function obtenerReportePorFolio(folio: string) {//NUEVO
  return request(`/obtener/reportes/folio`, {
    method: 'POST',
    body: JSON.stringify({ valor: folio }),
  })
}

export async function selectEq(//BORRAR
  tabla: string,
  campo: string,
  valor: any,
  columnas: string[] = ['*'],
) {
  return request(`/select/${tabla}/eq`, {
    method: 'POST',
    body: JSON.stringify({ campo, valor, columnas }),
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


export async function obtenerJefeIDPorUsuarioID(usuarioId: number | string) {//NUEVO
  return request(`/obtener/jefes/usuarioID`, {
    method: 'POST',
    body: JSON.stringify({ valor: usuarioId }),
  })
}

export async function updateEq(tabla: string, campo: string, valor: any, data: any) {
  return request(`/update/${tabla}/eq`, {
    method: 'PUT',
    body: JSON.stringify({ campo, valor, data }),
  })
}

export async function callRpc(fn: string, params: any) {//BORRAR
  return request(`/rpc/${fn}`, {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function obtenerUsuarioPorCorreoYContrasena(params: any) {//NUEVO
  return request(`/obtener/usuarios/CorreoContrasena`, {
    method: 'POST',
    body: JSON.stringify(params),
  })
}



export async function insert(tabla: string, data: any) {//BORRAR
  return request(`/insert/${tabla}`, {
    method: 'POST',
    body: JSON.stringify(data),
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

export async function selectOrder(//BORRAR
  tabla: string,
  campo: string,
  columnas: string[] = ['*'],
  ascending: boolean = true,
) {
  return request(`/select/${tabla}/order`, {
    method: 'POST',
    body: JSON.stringify({ campo, columnas, ascending }),
  })
}

export async function obtenerDepartamentosOrdenadosPorId() {//NUEVO
  return request(`/obtener/departamentos/ordenadosPorId`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function selectEqOrder(//BORRAR
  tabla: string,
  campo: string,
  valor: any,
  orderBy: string,
  columnas: string[] = ['*'],
  ascending: boolean = true,
) {
  return request(`/select/${tabla}/eq/order`, {
    method: 'POST',
    body: JSON.stringify({ campo, valor, orderBy, columnas, ascending }),
  })
}

export async function obtenerProblemasPorDepartamentoID(depId: number | string) {//NUEVO
  return request(`/obtener/problemas/departamentoId`, {
    method: 'POST',
    body: JSON.stringify({ valor: depId }),
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

export async function getPublicUrl(filePath: string, bucket = 'fotos') {
  return request(`/storage/${bucket}/publicUrl`, {
    method: 'POST',
    body: JSON.stringify({ filePath }),
  })
}