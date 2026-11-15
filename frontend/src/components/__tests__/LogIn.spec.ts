import { mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HomeView from '@/views/HomeView.vue'
import { obtenerUsuarioPorCorreoYContrasena } from '@/services/supabaseController'
import { redireccionarUsuario } from '@/logic/redirectUser'
import router from '@/router'

vi.mock('@/logic/redirectUser', () => ({
  redireccionarUsuario: vi.fn(),
}))

// El modal de login se crea en document.body, fuera del componente.
// Se localiza por el botón de envío para no confundirlo con otros .modal.
const obtenerModalLogin = () =>
  document.querySelector<HTMLElement>('#login-submit')?.closest('.modal') as HTMLElement | null

describe('Pruebas Unitarias del inicio de sesión', () => {
  const storage = new Map<string, string>()
  let wrapper: VueWrapper<any> | null = null

  beforeEach(async () => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    storage.clear()
    vi.stubGlobal('localStorage', {
      setItem: (key: string, value: string) => storage.set(key, value),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
    })
    await router.push('/')
    await router.isReady()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  const abrirLogin = async () => {
    wrapper = mount(HomeView, {
      global: {
        plugins: [router],
        stubs: { ReporteDetalleModal: true },
      },
    })

    await wrapper.get('.btn-outline').trigger('click')

    const modal = obtenerModalLogin()
    expect(modal, 'el modal de login debe abrirse').not.toBeNull()
    return modal as HTMLElement
  }

  const enviarCredenciales = (modal: HTMLElement, correo: string, contrasena: string) => {
    const email = modal.querySelector('#login-email') as HTMLInputElement
    const password = modal.querySelector('#login-password') as HTMLInputElement
    email.value = correo
    password.value = contrasena
    modal.querySelector<HTMLButtonElement>('#login-submit')?.click()
    return { email, password }
  }

  it('PU-LG-01: Detectar un correo inválido', async () => {
    const modal = await abrirLogin()
    const { email } = enviarCredenciales(modal, 'correo-invalido', 'secreto123')

    expect(modal.querySelector('#error-email')?.textContent).toBe('Ingresa un correo válido')
    expect(email.classList.contains('input-error')).toBe(true)
    expect(obtenerUsuarioPorCorreoYContrasena).not.toHaveBeenCalled()
  })

  it('PU-LG-02: Resalta correo y contraseña cuando las credenciales no coinciden', async () => {
    vi.mocked(obtenerUsuarioPorCorreoYContrasena).mockResolvedValue({ data: [], error: null })
    const modal = await abrirLogin()
    const { email, password } = enviarCredenciales(modal, 'admin@georeporte.mx', 'secreto123')

    await vi.waitFor(() => {
      expect(modal.querySelector('#login-error-global')?.textContent).toBe(
        'Correo o contraseña incorrectos. Porfavor, verifica tus datos e intenta de nuevo.',
      )
    })

    expect(obtenerUsuarioPorCorreoYContrasena).toHaveBeenCalledWith({
      p_correo: 'admin@georeporte.mx',
      p_contrasena: 'secreto123',
    })
    expect(email.classList.contains('input-error')).toBe(true)
    expect(password.classList.contains('input-error')).toBe(true)
  })

  it('PU-LG-03: Valida que la contraseña tenga al menos seis caracteres', async () => {
    const modal = await abrirLogin()
    const { password } = enviarCredenciales(modal, 'admin@georeporte.mx', '123')

    expect(modal.querySelector('#error-password')?.textContent).toBe('Debe tener al menos 6 caracteres')
    expect(password.classList.contains('input-error')).toBe(true)
    expect(obtenerUsuarioPorCorreoYContrasena).not.toHaveBeenCalled()
  })

  it('PU-LG-04: Guarda el token, cierra el modal y redirige con credenciales correctas', async () => {
    vi.mocked(obtenerUsuarioPorCorreoYContrasena).mockResolvedValue({
      data: { token: 'token-de-prueba' },
      error: null,
    })

    const modal = await abrirLogin()
    enviarCredenciales(modal, 'admin@georeporte.mx', 'secreto123')

    await vi.waitFor(() => expect(redireccionarUsuario).toHaveBeenCalled())

    expect(localStorage.getItem('userToken')).toBe('token-de-prueba')
    expect(document.querySelector('#login-email')).toBeNull()
  })

  it('PU-LG-05: Muestra el mensaje del backend si la cuenta está dada de baja', async () => {
    vi.mocked(obtenerUsuarioPorCorreoYContrasena).mockResolvedValue({
      data: null,
      error: 'Esta cuenta ha sido dada de baja. Porfavor, contacta con el Director General',
    })

    const modal = await abrirLogin()
    enviarCredenciales(modal, 'admin@georeporte.mx', 'secreto123')

    await vi.waitFor(() => {
      expect(modal.querySelector('#login-error-global')?.textContent).toBe(
        'Esta cuenta ha sido dada de baja. Porfavor, contacta con el Director General',
      )
    })

    expect(redireccionarUsuario).not.toHaveBeenCalled()
    expect(localStorage.getItem('userToken')).toBeNull()
  })

  it('PU-LG-06: Muestra el mensaje de error que devuelve el servicio', async () => {
    vi.mocked(obtenerUsuarioPorCorreoYContrasena).mockResolvedValue({
      data: null,
      error: 'Credenciales inválidas',
    })

    const modal = await abrirLogin()
    enviarCredenciales(modal, 'admin@georeporte.mx', 'secreto123')

    await vi.waitFor(() => {
      expect(modal.querySelector('#login-error-global')?.textContent).toBe('Credenciales inválidas')
    })

    expect(redireccionarUsuario).not.toHaveBeenCalled()
  })
})