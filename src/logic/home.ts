import { supabase } from '../lib/supabase'

export const verEstadoReporte = () => {
  const modal = document.createElement('div')
  modal.classList.add('modal')
  document.body.appendChild(modal)

  modal.innerHTML = `
    <div class="modal-contenido">
      <h2>Ver Estado del Reporte</h2>
      <p>Ingrese el Folio del reporte:</p>
      <input id="folio-input" type="text" placeholder="Folio" />
      <button id="buscar-btn">Buscar</button>
      <div id="resultado-reporte" style="margin-top:20px; text-align:left;"></div>
      <button id="cerrar-btn" style="margin-top:20px; background:#dc3545; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">
        Cerrar
      </button>
    </div>
  `

  const buscarBtn = modal.querySelector('#buscar-btn') as HTMLButtonElement
  const folioInput = modal.querySelector('#folio-input') as HTMLInputElement
  const resultadoDiv = modal.querySelector('#resultado-reporte') as HTMLDivElement
  const cerrarBtn = modal.querySelector('#cerrar-btn') as HTMLButtonElement

  buscarBtn.addEventListener('click', async () => {
    const folio = folioInput.value.trim()
    if (!folio) {
      resultadoDiv.innerHTML = `<p style="color:red;">Por favor ingrese un folio válido.</p>`
      return
    }

    const resultado = await mostrarEstadoReporte(folio)
    if (resultado) {
      resultadoDiv.innerHTML = `
        <h3>Información del reporte</h3>
        <p><strong>Folio:</strong> ${resultado.folio}</p>
        <p><strong>Estado:</strong> ${resultado.estado}</p>
        <p><strong>Departamento actual:</strong> ${resultado.departamentoActual}</p>
        <p><strong>Problema:</strong> ${resultado.problema}</p>
        <p><strong>Domicilio:</strong> ${resultado.domicilio}</p>
      `
    } else {
      resultadoDiv.innerHTML = `<p style="color:red;">No se encontró información para el folio ingresado.</p>`
    }
  })

  cerrarBtn.addEventListener('click', () => {
    document.body.removeChild(modal)
  })
}


export const mostrarEstadoReporte = async (folio: string) => {
  try {
    // 1. Buscar estado y departamentoactual en reportesexistentes con join a departamentos
    const { data: estadoData, error: estadoError } = await supabase
      .from('reportesexistentes')
      .select(`
        estado,
        departamentos:departamentoactual ( nombre )
      `)
      .eq('folio', folio)
      .single()

    if (estadoError) throw estadoError

    // 2. Buscar problema y domicilio en reportes, con joins a departamentos y problemas
    const { data: reporteData, error: reporteError } = await supabase
      .from('reportes')
      .select(`
        domicilio,
        departamentos ( nombre ),
        problemas ( nombre )
      `)
      .eq('folio', folio)
      .single()

    if (reporteError) throw reporteError

    return {
      folio,
      estado: estadoData?.estado,
      departamentoActual: estadoData?.departamentos?.nombre, // nombre del departamento actual
      problema: reporteData?.problemas?.nombre,              // nombre del problema
      domicilio: reporteData?.domicilio
    }
  } catch (error: any) {
    console.error('Error al consultar estado del reporte:', error.message)
    return null
  }
}
import { ref } from 'vue'
export const menuAbierto = ref(false)
export const menuRef = ref<HTMLElement | null>(null)

export const iniciarSesionAdmin = () => {
  // Cerrar menú si estaba abierto
  menuAbierto.value = false

  // Crear contenedor del modal
  const modal = document.createElement('div')
  modal.className = 'modal'

  // Contenido del modal
  modal.innerHTML = `
    <div class="modal-contenido">
      <h2>Iniciar sesión</h2>
      <p>Ingresa tus credenciales</p>
      <input type="text" id="login-email" placeholder="Correo electrónico" />
      <input type="password" id="login-password" placeholder="Contraseña" />
      <p id="login-error" style="color:red; display:none;"></p>
      <button id="login-submit">Iniciar sesión</button>
      <button id="login-cancel" style="margin-top:10px; background:#ccc; color:#000;">Cancelar</button>
    </div>
  `

  // Agregar modal al body
  document.body.appendChild(modal)

  // Referencias a los elementos
  const emailInput = modal.querySelector('#login-email') as HTMLInputElement
  const passwordInput = modal.querySelector('#login-password') as HTMLInputElement
  const errorMsg = modal.querySelector('#login-error') as HTMLParagraphElement
  const submitBtn = modal.querySelector('#login-submit') as HTMLButtonElement
  const cancelBtn = modal.querySelector('#login-cancel') as HTMLButtonElement

  // Validación al enviar
  submitBtn.addEventListener('click', () => {
    const email = emailInput.value.trim()
    const password = passwordInput.value.trim()

    if (!email || !password) {
      errorMsg.textContent = 'Por favor ingresa correo y contraseña'
      errorMsg.style.display = 'block'
      return
    }

    const regexEmail = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
    if (!regexEmail.test(email)) {
      errorMsg.textContent = 'Correo inválido'
      errorMsg.style.display = 'block'
      return
    }

    if (password.length < 6) {
      errorMsg.textContent = 'La contraseña debe tener al menos 6 caracteres'
      errorMsg.style.display = 'block'
      return
    }

    // Aquí va tu lógica real de login
    alert(`Login correcto: ${email}`)

    document.body.removeChild(modal)
  })

  // Cancelar y cerrar modal
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(modal)
  })

  // Cerrar modal si se hace click fuera del contenido
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      document.body.removeChild(modal)
    }
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