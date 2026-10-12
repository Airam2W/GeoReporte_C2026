import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/alertas', () => ({
	Toast: { fire: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/logic/redirectUser', () => ({
	redireccionarUsuario: vi.fn(),
}))

import HomeView from '@/views/HomeView.vue'
import { callRpc } from '@/services/supabaseController'
import { redireccionarUsuario } from '@/logic/redirectUser'
import router from '@/router'
import { menuAbierto } from '@/logic/home'
import './setup' 
 
describe('Pruebas Unitarias del inicio de sesión', () => {
	const sessionStorage = new Map<string, string>()

	beforeEach(async () => {
		vi.clearAllMocks()
		document.body.innerHTML = ''
		sessionStorage.clear()
		menuAbierto.value = false
		vi.stubGlobal('localStorage', {
			setItem: (key: string, value: string) => sessionStorage.set(key, value),
			getItem: (key: string) => sessionStorage.get(key) ?? null,
			removeItem: (key: string) => sessionStorage.delete(key),
		})
		await router.push('/')
		await router.isReady()
	})

	afterEach(() => {
		document.querySelector('.modal')?.remove()
	})

	const abrirLogin = async () => {
		const wrapper = mount(HomeView, {
			global: { plugins: [router] },
		})

		await wrapper.get('.menu-btn').trigger('click')
		await wrapper.vm.$nextTick()
		await wrapper.get('.menu-list li').trigger('click')

		return { wrapper, modal: document.querySelector('.modal') as HTMLElement }
	}

	it('PU-LG-01: Detectar un correo inválido', async () => {
		const { wrapper, modal } = await abrirLogin()
		const email = modal.querySelector('#login-email') as HTMLInputElement
		const password = modal.querySelector('#login-password') as HTMLInputElement

		email.value = 'correo-invalido'
		password.value = 'secreto123'
		modal.querySelector<HTMLButtonElement>('#login-submit')?.click()
		await wrapper.vm.$nextTick()

		expect(modal.querySelector('#error-email')?.textContent).toBe('Ingresa un correo válido')
		expect(email.classList.contains('input-error')).toBe(true)
		expect(callRpc).not.toHaveBeenCalled()
	})

	it('PU-LG-02: resalta correo y contraseña cuando las credenciales no responden', async () => {
		vi.mocked(callRpc).mockResolvedValue({ data: [], error: null })
		const { wrapper, modal } = await abrirLogin()
		const email = modal.querySelector('#login-email') as HTMLInputElement
		const password = modal.querySelector('#login-password') as HTMLInputElement

		email.value = 'admin@georeporte.mx'
		password.value = 'secreto123'
		modal.querySelector<HTMLButtonElement>('#login-submit')?.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(callRpc).toHaveBeenCalledWith('login_usuario', {
			p_correo: 'admin@georeporte.mx',
			p_contrasena: 'secreto123',
		})
		expect(modal.querySelector('#login-error-global')?.textContent).toBe('Correo o contraseña incorrectos')
		expect(email.classList.contains('input-error')).toBe(true)
		expect(password.classList.contains('input-error')).toBe(true)
		wrapper.unmount()
	})

	it('PU-LG-03: valida que la contraseña sea obligatoria y tenga seis caracteres', async () => {
		const { wrapper, modal } = await abrirLogin()
		const email = modal.querySelector('#login-email') as HTMLInputElement
		const password = modal.querySelector('#login-password') as HTMLInputElement

		email.value = 'admin@georeporte.mx'
		password.value = '123'
		modal.querySelector<HTMLButtonElement>('#login-submit')?.click()
		await wrapper.vm.$nextTick()

		expect(modal.querySelector('#error-password')?.textContent).toBe('Debe tener al menos 6 caracteres')
		expect(password.classList.contains('input-error')).toBe(true)
		expect(callRpc).not.toHaveBeenCalled()
	})

	it('PU-LG-04: guarda la sesión y redirige con credenciales correctas', async () => {
		const usuarioMock = { id: 1, nombre: 'Administrador', estado: 'Activo', tipo_id: 2 }
		vi.mocked(callRpc).mockResolvedValue({ data: [usuarioMock], error: null })

		const { wrapper, modal } = await abrirLogin()
		const email = modal.querySelector('#login-email') as HTMLInputElement
		const password = modal.querySelector('#login-password') as HTMLInputElement

		email.value = 'admin@georeporte.mx'
		password.value = 'secreto123'
		modal.querySelector<HTMLButtonElement>('#login-submit')?.click()

		await vi.waitFor(() => expect(redireccionarUsuario).toHaveBeenCalled())

		expect(localStorage.getItem('adminSession')).toBe(JSON.stringify(usuarioMock))
		expect(document.querySelector('.modal')).toBeNull()
		wrapper.unmount()
	})

	it('PU-LG-05: bloquea el acceso si la cuenta está dada de baja', async () => {
		vi.mocked(callRpc).mockResolvedValue({
			data: [{ id: 1, nombre: 'Administrador', estado: 'Inactivo', tipo_id: 2 }],
			error: null,
		})

		const { wrapper, modal } = await abrirLogin()
		const email = modal.querySelector('#login-email') as HTMLInputElement
		const password = modal.querySelector('#login-password') as HTMLInputElement

		email.value = 'admin@georeporte.mx'
		password.value = 'secreto123'
		modal.querySelector<HTMLButtonElement>('#login-submit')?.click()
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(modal.querySelector('#login-error-global')?.textContent).toBe(
			'Esta cuenta ha sido dada de baja. Porfavor, contacta con el Director General',
		)
		expect(redireccionarUsuario).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})