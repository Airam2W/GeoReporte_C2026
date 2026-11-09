import { ref } from 'vue'
import { redireccionarUsuario } from './redirectUser'
export const menuAbierto = ref(false)
export const menuRef = ref<HTMLElement | null>(null)
import { obtenerUsuarioPorCorreoYContrasena } from '../services/supabaseController'
import LogoGR from '../assets/Logo.png'

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
  const modal = document.createElement('div')
  modal.className = 'modal'

  modal.innerHTML = `
    <button id="login-cancel" class="btn-volver-flotante">Volver al inicio ✕</button>

    <div class="modal-contenido">
      <img src="${LogoGR}" alt="Logo GeoReporte" class="logo-georeporte-center" />

      <h1 class="card-title texto-tinto">GeoReporte</h1>
      <p class="card-subtitle" style="margin-bottom: 24px;">Plataforma ciudadana para la gestión e inicio de sesión de reportes públicos.</p>

      <div class="input-group">
        <label>Correo electrónico</label>
        <input type="email" id="login-email" placeholder="ejemplo@correo.com" />
        <span id="error-email" class="msg-error"></span>
      </div>

      <div class="input-group">
        <label>Contraseña</label>
        <div class="password-container">
          <input type="password" id="login-password" placeholder="••••••••••••" />
          <button type="button" id="toggle-password" class="toggle-password"
            title="Mostrar contraseña" aria-label="Mostrar contraseña">${ICONO_OJO_CERRADO}</button>
        </div>
        <span id="error-password" class="msg-error"></span>
      </div>

      <p id="login-error-global" class="msg-error" style="text-align: center; margin-bottom: 10px;"></p>

      <button id="login-submit" type="submit">Iniciar sesión</button>
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

  // Enter triggers Login
  const handleEnter = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submitBtn.click()
    }
  }

  emailInput.addEventListener('keydown', handleEnter)
  passwordInput.addEventListener('keydown', handleEnter)

  // Limpiar visual de errores
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

    // Petición a Supabase
    submitBtn.disabled = true
    submitBtn.textContent = 'Iniciando...'

    try {
      const {data, error} = await obtenerUsuarioPorCorreoYContrasena({p_correo: email, p_contrasena: password})
      const mensajeBackend = error || 'Correo o contraseña incorrectos. Porfavor, verifica tus datos e intenta de nuevo.'

      if (error || !data || data.length === 0) {
        errorGlobal.textContent = mensajeBackend
        errorGlobal.style.display = 'block'
        emailInput.classList.add('input-error')
        passwordInput.classList.add('input-error')

        submitBtn.disabled = false
        submitBtn.textContent = 'Iniciar sesión'
        return
      }

      const tokenUsuario = data.token
      localStorage.setItem('userToken', tokenUsuario)

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
