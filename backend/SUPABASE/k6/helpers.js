import http from 'k6/http'
import { check } from 'k6'

export const baseUrl = (__ENV.K6_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

export function requireLoginCredentials() {
  if (!__ENV.K6_LOGIN_EMAIL || !__ENV.K6_LOGIN_PASSWORD) {
    throw new Error(
      'Configura K6_LOGIN_EMAIL y K6_LOGIN_PASSWORD antes de ejecutar esta prueba',
    )
  }
}

export function loginUser() {
  const response = http.post(
    `${baseUrl}/rpc/login_usuario`,
    JSON.stringify({
      p_correo: __ENV.K6_LOGIN_EMAIL,
      p_contrasena: __ENV.K6_LOGIN_PASSWORD,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: {
        endpoint: 'rpc-login-usuario',
      },
    },
  )

  let body
  try {
    body = response.json()
  } catch {
    body = null
  }

  const loginSucceeded = body !== null && body.error === null && Array.isArray(body.data)

  check(response, {
    'login responde 200': (res) => res.status === 200,
    'login devuelve data': () => loginSucceeded,
    'login devuelve un usuario': () => loginSucceeded && body.data.length > 0,
  })

  return loginSucceeded && body.data.length > 0
}

export function selectDepartments() {
  const response = http.post(
    `${baseUrl}/select/departamentos/order`,
    JSON.stringify({
      campo: 'id',
      columnas: ['id', 'nombre'],
      ascending: true,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: {
        endpoint: 'select-departamentos-order',
      },
    },
  )

  let body
  try {
    body = response.json()
  } catch {
    body = null
  }

  check(response, {
    'status es 200': (res) => res.status === 200,
    'respuesta contiene data': () => body !== null && Object.prototype.hasOwnProperty.call(body, 'data'),
    'respuesta no contiene error': () => body !== null && body.error === null,
  })

  return response
}
