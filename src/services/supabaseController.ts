export const API_URL = import.meta.env.VITE_BACKEND_URL // URL del servidor en Render

// Helper para llamadas — nunca lanza excepción, siempre devuelve { data, error }
async function request(path: string, options: RequestInit = {}) {
  try {
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

export async function selectIlike(
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

export async function selectIlikeMaybeSingle(tabla: string, campo: string, valor: string) {
  return request(`/select/${tabla}/ilike/maybeSingle`, {
    method: 'POST',
    body: JSON.stringify({ campo, valor }),
  })
}

export async function selectEqSingle(
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

export async function selectEq(
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

export async function updateEq(tabla: string, campo: string, valor: any, data: any) {
  return request(`/update/${tabla}/eq`, {
    method: 'PUT',
    body: JSON.stringify({ campo, valor, data }),
  })
}

export async function callRpc(fn: string, params: any) {
  return request(`/rpc/${fn}`, {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function insert(tabla: string, data: any) {
  return request(`/insert/${tabla}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function selectOrder(
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

export async function selectEqOrder(
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

// ------------------ Storage ------------------

export async function uploadFoto(filePath: string, file: File) {
  const formData = new FormData()
  formData.append('filePath', filePath)
  formData.append('file', file)

  try {
    const res = await fetch(`${API_URL}/storage/fotos/upload`, {
      method: 'POST',
      body: formData,
    })
    return await res.json()
  } catch (err: any) {
    return { data: null, error: { message: err?.message || 'Error de red' } }
  }
}

export async function getPublicUrl(filePath: string) {
  return request(`/storage/fotos/publicUrl`, {
    method: 'POST',
    body: JSON.stringify({ filePath }),
  })
}