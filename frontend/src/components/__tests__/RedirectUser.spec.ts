import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))
vi.mock('@/router', () => ({ default: { push: pushMock } }))

import { redireccionarUsuario } from '@/logic/redirectUser'

// JWT falso: solo importa el payload (segunda parte)
const crearToken = (payload: object) => `cabecera.${btoa(JSON.stringify(payload))}.firma`

describe('Pruebas Unitarias de redirección por rol', () => {
	const storage = new Map<string, string>()

	beforeEach(() => {
		vi.clearAllMocks()
		storage.clear()
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
		})
		vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	it.each([
		[1, '/management'],
		[2, '/dashboard'],
		[3, '/supervisor'],
		[4, '/jefe'],
		[6, '/external'],
		[99, '/'],
	])('PU-RD-01: el tipo_id %i redirige a %s', (tipo_id, ruta) => {
		storage.set('userToken', crearToken({ id: 1, tipo_id }))
		redireccionarUsuario()
		expect(pushMock).toHaveBeenCalledWith(ruta)
	})

	it('PU-RD-02: no redirige si no hay token', () => {
		redireccionarUsuario()
		expect(pushMock).not.toHaveBeenCalled()
	})

	it('PU-RD-03: redirige al inicio si el token no es válido', () => {
		storage.set('userToken', 'token-basura')
		redireccionarUsuario()
		expect(pushMock).toHaveBeenCalledWith('/')
	})

	it('PU-RD-04: redirige al inicio si el token no trae tipo_id', () => {
		storage.set('userToken', crearToken({ id: 1 }))
		redireccionarUsuario()
		expect(pushMock).toHaveBeenCalledWith('/')
	})
})