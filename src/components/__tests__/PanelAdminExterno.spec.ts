import { mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PanelAdminExterno from '@/views/PanelAdminExterno.vue'
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
		folio: 'EXT-BAS-20260915-001-ABC123',
		descripcion: 'Bache frente al parque',
		nombre: 'Angel',
		telefono: '6671234567',
		domicilio: 'Av. Álvaro Obregón 450, Centro',
		referencias: 'Frente al parque',
		foto_url: null,
		created_at: '2026-09-15T12:00:00Z',
		problemas_externos: { id: 1, nombre: 'Bache', nombreamigable: 'Bache en vialidad' },
		detalle_reporte: { estado_id: 1, estadoreporte: { estado: 'Pendiente' }, updated_at: '2026-09-15T12:00:00Z' },
	},
	{
		folio: 'EXT-ALU-20260914-002-XYZ789',
		descripcion: 'Luminaria apagada',
		nombre: 'Maria',
		telefono: '6679876543',
		domicilio: 'Blvd. Universitarios 100, Tres Ríos',
		referencias: '',
		foto_url: null,
		created_at: '2026-09-14T12:00:00Z',
		problemas_externos: { id: 2, nombre: 'Alumbrado', nombreamigable: 'Falla de iluminación' },
		detalle_reporte: { estado_id: 2, estadoreporte: { estado: 'En Proceso' }, updated_at: '2026-09-14T12:00:00Z' },
	},
	{
		folio: 'EXT-SEG-20260913-003-QWE456',
		descripcion: 'Reporte no procedente',
		nombre: 'Luis',
		telefono: '6675550000',
		domicilio: 'Calle Rosales 12, Centro',
		referencias: '',
		foto_url: null,
		created_at: '2026-09-13T12:00:00Z',
		problemas_externos: { id: 3, nombre: 'Seguridad', nombreamigable: 'Situación de riesgo' },
		detalle_reporte: { estado_id: 3, estadoreporte: { estado: 'Rechazado' }, updated_at: '2026-09-13T12:00:00Z' },
	},
	{
		folio: 'EXT-OBR-20260912-004-LMN321',
		descripcion: 'Obra terminada',
		nombre: 'Sofia',
		telefono: '6674440000',
		domicilio: 'Calle Reforma 20, Centro',
		referencias: '',
		foto_url: null,
		created_at: '2026-09-12T12:00:00Z',
		problemas_externos: { id: 4, nombre: 'Obra', nombreamigable: 'Obra pública' },
		detalle_reporte: { estado_id: 4, estadoreporte: { estado: 'Finalizado' }, updated_at: '2026-09-12T12:00:00Z' },
	},
]

describe('Pruebas del panel del administrador externo', () => {
	let wrapper: VueWrapper<any>
	let reportesEstado: any[]

	beforeEach(async () => {
		vi.clearAllMocks()
		reportesEstado = structuredClone(reportesMock)

		const storage = new Map([
			['adminSession', JSON.stringify({ id: 6, nombre: 'Administrador Externo', departamento_id: 10, tipo_id: 6 })],
		])
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
		})

		// selectEq(tabla, campo, valor, columnas)
		vi.mocked(db.selectEq).mockImplementation(async (tabla: string) => {
			if (tabla === 'problemas_externos') {
				return {
					data: [{ id: 1, nombre: 'Bache', nombreamigable: 'Bache en vialidad', departamento_externo_id: 10 }],
					error: null,
				}
			}
			if (tabla === 'departamentos_externos') {
				return { data: [{ id: 10, departamento: 'Servicios Externos' }], error: null }
			}
			return { data: [], error: null }
		})

		// selectEqOrder(tabla, campo, valor, orderBy, columnas, ascending)
		vi.mocked(db.selectEqOrder).mockImplementation(async () => ({
			data: structuredClone(reportesEstado),
			error: null,
		}))

		// updateEq(tabla, campo, valor, data)
		vi.mocked(db.updateEq).mockImplementation(async (_tabla: string, column: string, value: any, payload: any) => {
			const reporte = reportesEstado.find((item) => item[column] === value)
			if (reporte && 'estado_id' in payload) {
				const estadoId = payload.estado_id
				reporte.detalle_reporte.estado_id = estadoId
				reporte.detalle_reporte.estadoreporte.estado =
					estadoId === 1 ? 'Pendiente' : estadoId === 2 ? 'En Proceso' : estadoId === 3 ? 'Rechazado' : 'Finalizado'
			}
			return { data: null, error: null }
		})

		wrapper = mount(PanelAdminExterno)
		await vi.waitFor(() => expect(wrapper.vm.cargando).toBe(false))
	})

	afterEach(() => wrapper.unmount())

	it('busca reportes por folio y otras características', async () => {
		wrapper.vm.filtros.estado = ''
		wrapper.vm.filtros.busqueda = 'luminaria apagada'
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('tbody tr.fila-datos')).toHaveLength(1)
		expect(wrapper.find('tbody tr.fila-datos').text()).toContain('XYZ789')

		wrapper.vm.filtros.busqueda = 'ABC123'
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('tbody tr.fila-datos')).toHaveLength(1)
		expect(wrapper.find('tbody tr.fila-datos').text()).toContain('Bache en vialidad')
	})

	it('filtra reportes por Llegado, En Proceso, Rechazado y Finalizado', async () => {
		for (const [estado, folio] of [
			['Pendiente', 'ABC123'],
			['En Proceso', 'XYZ789'],
			['Rechazado', 'QWE456'],
			['Finalizado', 'LMN321'],
		]) {
			wrapper.vm.filtros.estado = estado
			await wrapper.vm.$nextTick()
			expect(wrapper.findAll('tbody tr.fila-datos')).toHaveLength(1)
			expect(wrapper.find('tbody tr.fila-datos').text()).toContain(folio)
		}
	})

	it('rechaza un reporte desde Ver y Actualizar Estado', async () => {
		wrapper.vm.filtros.estado = ''
		await wrapper.vm.$nextTick()
		await wrapper.find('.btn-accion').trigger('click') // botón "Ver detalle"
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.modal-card').text()).toContain('Rechazar Reporte')

		await wrapper.find('.modal-card .btn-peligroso').trigger('click')
		await vi.waitFor(() =>
			expect(db.updateEq).toHaveBeenCalledWith('detalle_reporte', 'folio', 'EXT-BAS-20260915-001-ABC123', { estado_id: 3 }),
		)
	})

	it('devuelve un reporte rechazado a Llegado', async () => {
		wrapper.vm.filtros.estado = 'Rechazado'
		await wrapper.vm.$nextTick()
		await wrapper.find('.btn-accion').trigger('click') // botón "Ver detalle"
		await wrapper.vm.$nextTick()

		const botonDevolver = wrapper.find('.modal-card .btn-primario')
		expect(botonDevolver.text()).toContain('Devolver a Pendiente')
		await botonDevolver.trigger('click')

		await vi.waitFor(() =>
			expect(db.updateEq).toHaveBeenCalledWith('detalle_reporte', 'folio', 'EXT-SEG-20260913-003-QWE456', { estado_id: 1 }),
		)
	})
}) 