import router from '@/router'
import { supabase } from '../lib/supabase'
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
export const menuAbierto = ref(false)
export const menuRef = ref<HTMLElement | null>(null)

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

      <div class="password-container">
        <input type="password" id="login-password" placeholder="Contraseña" />
        <span id="toggle-password" class="toggle-password">👁</span>
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

  const togglePassword = modal.querySelector('#toggle-password') as HTMLSpanElement

  togglePassword.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text'
      togglePassword.textContent = '⌣' // cambia el icono cuando se muestra
    } else {
      passwordInput.type = 'password'
      togglePassword.textContent = '👁' // vuelve al ojo cuando se oculta
    }
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
      const { data, error } = await supabase.rpc('login_usuario', {
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
        errorGlobal.textContent = 'Esta cuenta ha sido dada de baja. Porfavor, contacta con el Director General'
        errorGlobal.style.display = 'block'
        submitBtn.disabled = false
        submitBtn.textContent = 'Iniciar sesión'
        return
      }

      localStorage.setItem('adminSession', JSON.stringify(usuario))

      // Para éxito
      Toast.fire({
        icon: 'success',
        title: `¡Bienvenido de vuelta, ${usuario.nombre}!`,
      })

      document.body.removeChild(modal)

      switch (usuario.tipo_id) {
        case 1:
          router.push('/management')
          break;
        case 2:
          router.push('/dashboard')
          break;
        default:
          router.push('/dashboard')
          break;
        }

    } catch (err) {
      errorGlobal.textContent = 'Error al conectar con el servidor'
      errorGlobal.style.display = 'block'
      submitBtn.disabled = false
      submitBtn.textContent = 'Iniciar sesión'
    }
  })

  // Cancelar y cerrar modal
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(modal)
  })

  // Cerrar modal al hacer click fuera
  // modal.addEventListener('click', (event) => {
  //   if (event.target === modal) {
  //     document.body.removeChild(modal)
  //   }
  // })
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
