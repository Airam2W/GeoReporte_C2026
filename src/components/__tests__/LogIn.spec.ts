import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/alertas', () => ({
	Toast: { fire: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/logic/redirectUser', () => ({
	redireccionarUsuario: vi.fn(),
}))

import HomeView from '@/views/HomeView.vue'
import {
	obtenerUsuarioPorCorreoYContrasena,
	obtenerSupervisorIDPorUsuarioID,
	obtenerJefeIDPorUsuarioID,
} from '@/services/supabaseController'
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

	const enviarCredenciales = (modal: HTMLElement, correo: string, contrasena: string) => {
		const email = modal.querySelector('#login-email') as HTMLInputElement
		const password = modal.querySelector('#login-password') as HTMLInputElement
		email.value = correo
		password.value = contrasena
		modal.querySelector<HTMLButtonElement>('#login-submit')?.click()
		return { email, password }
	}

	it('PU-LG-01: Detectar un correo inválido', async () => {
		const { wrapper, modal } = await abrirLogin()
		const { email } = enviarCredenciales(modal, 'correo-invalido', 'secreto123')
		await wrapper.vm.$nextTick()

		expect(modal.querySelector('#error-email')?.textContent).toBe('Ingresa un correo válido')
		expect(email.classList.contains('input-error')).toBe(true)
		expect(obtenerUsuarioPorCorreoYContrasena).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it('PU-LG-02: resalta correo y contraseña cuando las credenciales no responden', async () => {
		vi.mocked(obtenerUsuarioPorCorreoYContrasena).mockResolvedValue({ data: [], error: null })
		const { wrapper, modal } = await abrirLogin()
		const { email, password } = enviarCredenciales(modal, 'admin@georeporte.mx', 'secreto123')
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(obtenerUsuarioPorCorreoYContrasena).toHaveBeenCalledWith({
			p_correo: 'admin@georeporte.mx',
			p_contrasena: 'secreto123',
		})
		expect(modal.querySelector('#login-error-global')?.textContent).toBe(
			'Correo o contraseña incorrectos. Porfavor, verifica tus datos e intenta de nuevo.',
		)
		expect(email.classList.contains('input-error')).toBe(true)
		expect(password.classList.contains('input-error')).toBe(true)
		wrapper.unmount()
	})

	it('PU-LG-03: valida que la contraseña sea obligatoria y tenga seis caracteres', async () => {
		const { wrapper, modal } = await abrirLogin()
		const { password } = enviarCredenciales(modal, 'admin@georeporte.mx', '123')
		await wrapper.vm.$nextTick()

		expect(modal.querySelector('#error-password')?.textContent).toBe('Debe tener al menos 6 caracteres')
		expect(password.classList.contains('input-error')).toBe(true)
		expect(obtenerUsuarioPorCorreoYContrasena).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it('PU-LG-04: guarda la sesión y redirige con credenciales correctas', async () => {
		const usuarioMock = { id: 1, nombre: 'Administrador', estado: 'Activo', tipo_id: 2 }
		vi.mocked(obtenerUsuarioPorCorreoYContrasena).mockResolvedValue({ data: [usuarioMock], error: null })

		const { wrapper, modal } = await abrirLogin()
		enviarCredenciales(modal, 'admin@georeporte.mx', 'secreto123')

		await vi.waitFor(() => expect(redireccionarUsuario).toHaveBeenCalled())

		expect(localStorage.getItem('userSession')).toBe(JSON.stringify(usuarioMock))
		expect(document.querySelector('.modal')).toBeNull()
		wrapper.unmount()
	})

	it('PU-LG-05: bloquea el acceso si la cuenta está dada de baja', async () => {
		vi.mocked(obtenerUsuarioPorCorreoYContrasena).mockResolvedValue({
			data: [{ id: 1, nombre: 'Administrador', estado: 'Inactivo', tipo_id: 2 }],
			error: null,
		})

		const { wrapper, modal } = await abrirLogin()
		enviarCredenciales(modal, 'admin@georeporte.mx', 'secreto123')
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(modal.querySelector('#login-error-global')?.textContent).toBe(
			'Esta cuenta ha sido dada de baja. Porfavor, contacta con el Director General',
		)
		expect(redireccionarUsuario).not.toHaveBeenCalled()
		expect(localStorage.getItem('userSession')).toBeNull()
		wrapper.unmount()
	})

	it('PU-LG-06: muestra el mensaje de error que devuelve el servicio', async () => {
		vi.mocked(obtenerUsuarioPorCorreoYContrasena).mockResolvedValue({
			data: null,
			error: 'Credenciales inválidas',
		})

		const { wrapper, modal } = await abrirLogin()
		enviarCredenciales(modal, 'admin@georeporte.mx', 'secreto123')
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(modal.querySelector('#login-error-global')?.textContent).toBe('Credenciales inválidas')
		expect(redireccionarUsuario).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it('PU-LG-07: un supervisor guarda su id_supervisor y departamento en la sesión', async () => {
		vi.mocked(obtenerUsuarioPorCorreoYContrasena).mockResolvedValue({
			data: [{ id: 7, nombre: 'Supervisor', estado: 'Alta', tipo_id: 3 }],
			error: null,
		})
		vi.mocked(obtenerSupervisorIDPorUsuarioID).mockResolvedValue({
			data: [{ id: 20, departamento_id: 1 }],
			error: null,
		})

		const { wrapper, modal } = await abrirLogin()
		enviarCredenciales(modal, 'sup@georeporte.mx', 'secreto123')
		await vi.waitFor(() => expect(redireccionarUsuario).toHaveBeenCalled())

		expect(obtenerSupervisorIDPorUsuarioID).toHaveBeenCalledWith(7)
		expect(JSON.parse(localStorage.getItem('userSession')!)).toEqual(
			expect.objectContaining({ id: 7, tipo_id: 3, id_supervisor: 20, departamento_id: 1 }),
		)
		wrapper.unmount()
	})

	it('PU-LG-08: un jefe guarda su id_jefe y el departamento de su supervisor', async () => {
		vi.mocked(obtenerUsuarioPorCorreoYContrasena).mockResolvedValue({
			data: [{ id: 8, nombre: 'Jefe', estado: 'Alta', tipo_id: 4 }],
			error: null,
		})
		vi.mocked(obtenerJefeIDPorUsuarioID).mockResolvedValue({
			data: [{ id: 30, supervisores: { departamento_id: 1 } }],
			error: null,
		})

		const { wrapper, modal } = await abrirLogin()
		enviarCredenciales(modal, 'jefe@georeporte.mx', 'secreto123')
		await vi.waitFor(() => expect(redireccionarUsuario).toHaveBeenCalled())

		expect(obtenerJefeIDPorUsuarioID).toHaveBeenCalledWith(8)
		expect(JSON.parse(localStorage.getItem('userSession')!)).toEqual(
			expect.objectContaining({ id: 8, tipo_id: 4, id_jefe: 30, departamento_id: 1 }),
		)
		wrapper.unmount()
	})
})