import router from '@/router'
import { Toast } from '../utils/alertas'

// export const verEstadoReporte = () => {
//   const modal = document.createElement('div')
//   modal.classList.add('modal')
//   document.body.appendChild(modal)

//   modal.innerHTML = `
//     <div class="modal-contenido">
//       <h2>Ver Estado del Reporte</h2>
//       <p>Ingrese el Folio del reporte:</p>
//       <input id="folio-input" type="text" placeholder="Folio" />
//       <button id="buscar-btn">Buscar</button>
//       <div id="resultado-reporte" style="margin-top:20px; text-align:left;"></div>
//       <button id="cerrar-btn" style="margin-top:20px; background:#dc3545; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">
//         Cerrar
//       </button>
//     </div>
//   `

//   const buscarBtn = modal.querySelector('#buscar-btn') as HTMLButtonElement
//   const folioInput = modal.querySelector('#folio-input') as HTMLInputElement
//   const resultadoDiv = modal.querySelector('#resultado-reporte') as HTMLDivElement
//   const cerrarBtn = modal.querySelector('#cerrar-btn') as HTMLButtonElement

//   buscarBtn.addEventListener('click', async () => {
//     const folio = folioInput.value.trim()
//     if (!folio) {
//       resultadoDiv.innerHTML = `<p style="color:red;">Por favor ingrese un folio válido.</p>`
//       return
//     }

//     const resultado = await mostrarEstadoReporte(folio)
//     if (resultado) {
//       resultadoDiv.innerHTML = `
//         <h3>Información del reporte</h3>
//         <p><strong>Folio:</strong> ${resultado.folio}</p>
//         <p><strong>Estado:</strong> ${resultado.estado}</p>
//         <p><strong>Departamento actual:</strong> ${resultado.departamentoActual}</p>
//         <p><strong>Problema:</strong> ${resultado.problema}</p>
//         <p><strong>Domicilio:</strong> ${resultado.domicilio}</p>
//       `
//     } else {
//       resultadoDiv.innerHTML = `<p style="color:red;">No se encontró información para el folio ingresado.</p>`
//     }
//   })

//   cerrarBtn.addEventListener('click', () => {
//     document.body.removeChild(modal)
//   })
// }

// export const mostrarEstadoReporte = async (folio: string) => {
//   try {
//     // 1. Buscar estado y departamentoactual en reportesexistentes con join a departamentos
//     const { data: estadoData, error: estadoError } = await supabase
//       .from('reportesexistentes')
//       .select(`
//         estado,
//         departamentos:departamentoactual ( nombre )
//       `)
//       .eq('folio', folio)
//       .single()

//     if (estadoError) throw estadoError

//     // 2. Buscar problema y domicilio en reportes, con joins a departamentos y problemas
//     const { data: reporteData, error: reporteError } = await supabase
//       .from('reportes')
//       .select(`
//         domicilio,
//         departamentos ( nombre ),
//         problemas ( nombre )
//       `)
//       .eq('folio', folio)
//       .single()

//     if (reporteError) throw reporteError

//     return {
//       folio,
//       estado: estadoData?.estado,
//       departamentoActual: estadoData?.departamentos?.nombre, // nombre del departamento actual
//       problema: reporteData?.problemas?.nombre,              // nombre del problema
//       domicilio: reporteData?.domicilio
//     }
//   } catch (error: any) {
//     console.error('Error al consultar estado del reporte:', error.message)
//     return null
//   }
// }
import { ref } from 'vue'
import { redireccionarUsuario } from './redirectUser'
export const menuAbierto = ref(false)
export const menuRef = ref<HTMLElement | null>(null)
import { callRpc, selectEq } from '../services/supabaseController'

const ICONO_OJO_ABIERTO = `
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>`

const ICONO_OJO_CERRADO = `
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>`

export const iniciarSesion = () => {
  // menuAbierto.value = false // Descomenta si tienes acceso a esta variable aquí

  const modal = document.createElement('div')
  modal.className = 'modal'

  // Estructura actualizada con los spans de error individuales
  modal.innerHTML = `
    <div class="modal-contenido">
      <h2>Iniciar sesión</h2>
      <p>Ingresa tus credenciales</p>

      <div style="margin-bottom: 12px; text-align: left;">
        <input type="email" id="login-email" placeholder="Correo electrónico" style="width: 100%;" />
        <span id="error-email" class="msg-error" style="display: none; color: #e74c3c; font-size: 0.75rem; font-weight: 600; margin-top: 4px;"></span>
      </div>

      <div style="margin-bottom: 12px; text-align: left;">
        <div class="password-container" style="margin-bottom: 0;">
          <input type="password" id="login-password" placeholder="Contraseña" />
          <button type="button" id="toggle-password" class="toggle-password"
            title="Mostrar contraseña" aria-label="Mostrar contraseña">${ICONO_OJO_CERRADO}</button>
        </div>
        <span id="error-password" class="msg-error"></span>
      </div>

      <p id="login-error-global" class="msg-error" style="display: none; color: #e74c3c; font-size: 0.85rem; font-weight: 600; text-align: center;"></p>

      <button id="login-submit" type="submit" style="width: 100%; margin-top: 10px;">Iniciar sesión</button>
      <button id="login-cancel" style="width: 100%; margin-top: 10px; background: #ccc; color: #000;">Cancelar</button>
    </div>
  `

  document.body.appendChild(modal)

  // Referencias al DOM
  const emailInput = modal.querySelector('#login-email') as HTMLInputElement
  const passwordInput = modal.querySelector('#login-password') as HTMLInputElement
  const errorEmail = modal.querySelector('#error-email') as HTMLSpanElement
  const errorPassword = modal.querySelector('#error-password') as HTMLSpanElement
  const errorGlobal = modal.querySelector('#login-error-global') as HTMLParagraphElement
  const submitBtn = modal.querySelector('#login-submit') as HTMLButtonElement
  const cancelBtn = modal.querySelector('#login-cancel') as HTMLButtonElement

  const togglePassword = modal.querySelector('#toggle-password') as HTMLButtonElement

  togglePassword.addEventListener('click', () => {
    const visible = passwordInput.type === 'text'
    passwordInput.type = visible ? 'password' : 'text'
    togglePassword.innerHTML = visible ? ICONO_OJO_CERRADO : ICONO_OJO_ABIERTO
    const texto = visible ? 'Mostrar contraseña' : 'Ocultar contraseña'
    togglePassword.title = texto
    togglePassword.setAttribute('aria-label', texto)
  })

  // Después de definir emailInput, passwordInput y submitBtn
  const handleEnter = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submitBtn.click() // dispara el mismo flujo que el botón
    }
  }

  emailInput.addEventListener('keydown', handleEnter)
  passwordInput.addEventListener('keydown', handleEnter)

  // Función auxiliar para limpiar errores visuales antes de validar
  const limpiarErrores = () => {
    emailInput.classList.remove('input-error')
    passwordInput.classList.remove('input-error')
    errorEmail.style.display = 'none'
    errorPassword.style.display = 'none'
    errorGlobal.style.display = 'none'
  }

  submitBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim()
    const password = passwordInput.value.trim()
    let esValido = true

    limpiarErrores()

    // Validación de Correo
    if (!email) {
      errorEmail.textContent = 'El correo es obligatorio'
      errorEmail.style.display = 'block'
      emailInput.classList.add('input-error')
      esValido = false
    } else {
      const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!regexEmail.test(email)) {
        errorEmail.textContent = 'Ingresa un correo válido'
        errorEmail.style.display = 'block'
        emailInput.classList.add('input-error')
        esValido = false
      }
    }

    // Validación de Contraseña
    if (!password) {
      errorPassword.textContent = 'La contraseña es obligatoria'
      errorPassword.style.display = 'block'
      passwordInput.classList.add('input-error')
      esValido = false
    } else if (password.length < 6) {
      errorPassword.textContent = 'Debe tener al menos 6 caracteres'
      errorPassword.style.display = 'block'
      passwordInput.classList.add('input-error')
      esValido = false
    }

    if (!esValido) return

    // --- Petición a Supabase ---
    submitBtn.disabled = true
    submitBtn.textContent = 'Iniciando...'

    try {
      const { data, error } = await callRpc('login_usuario', {
        p_correo: email,
        p_contrasena: password,
      })

      if (error || !data || data.length === 0) {
        errorGlobal.textContent = 'Correo o contraseña incorrectos'
        errorGlobal.style.display = 'block'
        emailInput.classList.add('input-error')
        passwordInput.classList.add('input-error')

        submitBtn.disabled = false
        submitBtn.textContent = 'Iniciar sesión'
        return
      }

      const usuario = data[0]

      if (usuario.estado !== 'Alta' && usuario.estado !== 'Activo') {
        errorGlobal.textContent =
          'Esta cuenta ha sido dada de baja. Porfavor, contacta con el Director General'
        errorGlobal.style.display = 'block'
        submitBtn.disabled = false
        submitBtn.textContent = 'Iniciar sesión'
        return
      }

      // Si el usuario es Supervisor (tipo_id === 3), traer su id de la tabla "supervisores"
      if (usuario.tipo_id === 3 || usuario.tipousuario_id === 3) {
        const { data: supData, error: supError } = await selectEq(
          'supervisores',
          'usuario_id',
          usuario.id,
          ['id', 'departamento_id'],
        )

        if (!supError && supData && supData.length > 0) {
          usuario.id_supervisor = supData[0].id
          // Si el RPC no trae ya el departamento_id, lo tomamos de aquí también
          if (!usuario.departamento_id) {
            usuario.departamento_id = supData[0].departamento_id
          }
        } else {
          console.error('No se pudo obtener el id de supervisor:', supError)
        }
      }

      // Si el usuario es Jefe (tipo_id === 4), traer su id y su departamento
      if (usuario.tipo_id === 4 || usuario.tipousuario_id === 4) {
        const { data: jefeData, error: jefeError } = await selectEq(
          'jefes',
          'usuario_id',
          usuario.id,
          ['id', 'supervisor_id', 'supervisores(departamento_id)'],
        )

        if (!jefeError && jefeData && jefeData.length > 0) {
          usuario.id_jefe = jefeData[0].id
          if (!usuario.departamento_id) {
            usuario.departamento_id = jefeData[0].supervisores?.departamento_id
          }
        } else {
          console.error('No se pudo obtener el id de jefe:', jefeError)
        }
      }

      localStorage.setItem('userSession', JSON.stringify(usuario))

      // Para éxito
      //Toast.fire({
      //  icon: 'success',
      //  title: `¡Bienvenido de vuelta, ${usuario.nombre}!`,
      //})

      document.body.removeChild(modal)

      redireccionarUsuario()
    } catch (err) {
      errorGlobal.textContent = 'Error al conectar con el servidor: ' + err
      errorGlobal.style.display = 'block'
      submitBtn.disabled = false
      submitBtn.textContent = 'Iniciar sesión'
    }
  })

  // Cancelar y cerrar modal
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(modal)
  })
}

// Detectar click fuera del menú
export const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuAbierto.value = false
  }
}

export const onMounted = (callback: () => void) => {
  callback()
}

export const onBeforeUnmount = (callback: () => void) => {
  callback()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
