import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PanelJefe from '@/views/PanelJefe.vue'
import * as db from '@/services/supabaseController'
import './setup'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<typeof import('vue-router')>()
	return {
		...actual,
		useRouter: () => ({ push: pushMock }),
	}
})

vi.mock('sweetalert2', () => ({
	default: {
		fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
		mixin: vi.fn().mockReturnValue({ fire: vi.fn().mockResolvedValue(undefined) }),
	},
}))

const reportesMock = [
	{
		folio: 'JEF-BAC-20260915-001-ABC123',
		domicilio: 'Av. Álvaro Obregón 450',
		created_at: '2026-09-15T12:00:00Z',
		problemas: { id: 1, nombre: 'Bache' },
		detalle_reporte: {
			estado_id: 7,
			fecha_inicio: '2026-09-15T13:00:00Z',
			fecha_cierre: null,
			jefe_id: 30,
			supervisor_id: 20,
			estadoreporte: { estado: 'En Proceso' },
			supervisores: { usuarios: { nombre: 'Ana', apellido_p: 'García', apellido_m: 'López' } },
		},
		historial_reporte: [],
	},
	{
		folio: 'JEF-LUZ-20260914-002-XYZ789',
		domicilio: 'Blvd. Universitarios 100',
		created_at: '2026-09-14T12:00:00Z',
		problemas: { id: 2, nombre: 'Alumbrado' },
		detalle_reporte: {
			estado_id: 7,
			fecha_inicio: '2026-09-14T13:00:00Z',
			fecha_cierre: null,
			jefe_id: 30,
			supervisor_id: 20,
			estadoreporte: { estado: 'En Proceso' },
			supervisores: { usuarios: { nombre: 'Luis', apellido_p: 'García', apellido_m: 'Soto' } },
		},
		historial_reporte: [],
	},
	{
		folio: 'JEF-DRE-20260913-003-QWE456',
		domicilio: 'Calle Rosales 12',
		created_at: '2026-09-13T12:00:00Z',
		problemas: { id: 3, nombre: 'Drenaje' },
		detalle_reporte: {
			estado_id: 8,
			fecha_inicio: '2026-09-13T13:00:00Z',
			fecha_cierre: null,
			jefe_id: 30,
			supervisor_id: 20,
			estadoreporte: { estado: 'Pendiente de Finalización' },
			supervisores: { usuarios: { nombre: 'Marta', apellido_p: 'Ruiz', apellido_m: 'Soto' } },
		},
		historial_reporte: [],
	},
]

describe('Pruebas de los filtros del panel del jefe', () => {
	let wrapper: VueWrapper<any>

	beforeEach(async () => {
		vi.clearAllMocks()

		const storage = new Map([
			[
				'userSession',
				JSON.stringify({
					id: 40,
					id_jefe: 30,
					nombre: 'Jefe de Servicios',
					departamento_id: 1,
					tipo_id: 4,
				}),
			],
		])
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
		})

		vi.mocked(db.esperarUsuario).mockResolvedValue(null)
		vi.mocked(db.selectEq).mockImplementation(async (tabla: string) => {
			if (tabla === 'problemas') {
				return {
					data: [
						{ id: 1, nombre: 'Bache', departamento_id: 1 },
						{ id: 2, nombre: 'Alumbrado', departamento_id: 1 },
						{ id: 3, nombre: 'Drenaje', departamento_id: 1 },
					],
					error: null,
				}
			}
			if (tabla === 'departamentos') {
				return { data: [{ id: 1, nombre: 'Servicios Publicos' }], error: null }
			}
			if (tabla === 'titulo') {
				return { data: [], error: null }
			}
			return { data: [], error: null }
		})
		vi.mocked(db.selectEqOrder).mockResolvedValue({
			data: structuredClone(reportesMock),
			error: null,
		})

		wrapper = mount(PanelJefe)
		await flushPromises()
	})

	afterEach(() => wrapper.unmount())

	it('filtra un reporte por folio', async () => {
		wrapper.vm.filtros.busqueda = 'XYZ789'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('XYZ789')
	})

	it('filtra un reporte por domicilio', async () => {
		wrapper.vm.filtros.busqueda = 'Rosales'
		wrapper.vm.filtros.estado = 'Pendiente de Finalización'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('Calle Rosales 12')
	})

	it('filtra reportes por fecha de creación', async () => {
		wrapper.vm.filtros.fecha = '2026-09-15'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('ABC123')
	})

	it('filtra reportes por tipo de problema', async () => {
		wrapper.vm.filtros.problema = '2'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('XYZ789')
	})
})