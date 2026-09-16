import { mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PanelAdministrador from '@/views/PanelAdministrador.vue'
import { supabase } from '@/lib/supabase'
import './setup'

const reportesMock = [
	{
		folio: 'ALU-BAC-20260915-001-ABC123',
		descripcion: 'Reporte de prueba',
		nombre: 'Angel',
		telefono: '6671234567',
		domicilio: 'Av. Álvaro Obregón 450',
		referencias: 'Frente al parque',
		foto_url: null,
		created_at: '2026-09-15T12:00:00Z',
		problemas: { id: 1, nombre: 'Bache' },
		reportesexistentes: [{ estado: 'Llegado' }],
	},
	{
		folio: 'ALU-LUZ-20260914-002-XYZ789',
		descripcion: 'Falla de iluminación',
		nombre: 'Maria',
		telefono: '6679876543',
		domicilio: 'Blvd. Universitarios 100',
		referencias: '',
		foto_url: null,
		created_at: '2026-09-14T12:00:00Z',
		problemas: { id: 2, nombre: 'Falla de iluminacion' },
		reportesexistentes: [{ estado: 'Llegado' }],
	},
]

describe('Pruebas del panel de filtros del administrador', () => {
	let wrapper: VueWrapper<any>

	beforeEach(async () => {
		vi.clearAllMocks()

		const storage = new Map<string, string>([
			[
				'adminSession',
				JSON.stringify({ id: 1, nombre: 'Administrador', departamento_id: 1 }),
			],
		])

		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
		})

		;(supabase.from as any).mockImplementation((table: string) => {
			if (table === 'problemas') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							data: [
								{ id: 1, nombre: 'Bache', departamento_id: 1 },
								{ id: 2, nombre: 'Falla de iluminacion', departamento_id: 1 },
							],
							error: null,
						}),
					}),
				}
			}

			if (table === 'departamentos') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							data: [{ id: 1, nombre: 'Servicios Publicos' }],
							error: null,
						}),
					}),
				}
			}

			if (table === 'reportes') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({ data: reportesMock, error: null }),
						}),
					}),
				}
			}

			return {}
		})

		wrapper = mount(PanelAdministrador)
		await vi.waitFor(() => expect(wrapper.vm.cargando).toBe(false))
	})

	afterEach(() => {
		wrapper.unmount()
	})

	it('PU-PA-01: encuentra un reporte por folio y lo muestra en la tabla', async () => {
		wrapper.vm.filtros.busqueda = 'ALU-BAC-20260915-001-ABC123'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')

		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('ABC123')
		expect(filas[0].text()).toContain('Bache')
		expect(filas[0].text()).toContain('Av. Álvaro Obregón 450')
	})

	it('PU-PA-02: encuentra un reporte por fecha y muestra el reporte correspondiente', async () => {
		wrapper.vm.filtros.fecha = '2026-09-15'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')

		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('ABC123')
		expect(filas[0].text()).toContain('Bache')
	})

	it('PU-PA-03: filtra por problema y muestra el reporte correspondiente', async () => {
		wrapper.vm.filtros.problema = '2'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')

		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('XYZ789')
		expect(filas[0].text()).toContain('Falla de iluminacion')
	})
})
