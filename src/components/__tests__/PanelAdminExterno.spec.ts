import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
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

		// La sesión ahora vive en "userSession" y el panel exige tipo_id === 6
		const storage = new Map([
			['userSession', JSON.stringify({ id: 6, nombre: 'Administrador Externo', departamento_id: 10, tipo_id: 6 })],
		])
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
		})

		vi.mocked(db.esperarUsuario).mockResolvedValue(null)

		// Los problemas del departamento ahora salen de obtenerProblematicasExternasPorID(departamento_id)
		vi.mocked(db.obtenerProblematicasExternasPorID).mockResolvedValue({
			data: [{ id: 1, nombre: 'Bache', nombreamigable: 'Bache en vialidad', departamento_externo_id: 10 }],
			error: null,
		})

		// selectEq(tabla, campo, valor, columnas)
		vi.mocked(db.selectEq).mockImplementation(async (tabla: string) => {
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

	// Busca un botón dentro del modal por su texto (el primer .btn-primario es "Descargar PDF")
	const botonDelModal = (texto: string) =>
		wrapper.findAll('.modal-card button').find((b) => b.text().includes(texto))

	it('carga el departamento, los problemas y los reportes turnados', () => {
		expect(db.obtenerProblematicasExternasPorID).toHaveBeenCalledWith(10)
		expect(db.selectEqOrder).toHaveBeenCalledWith('reportes', 'departamento_externo_id', 10, 'created_at', expect.any(Array), false)
		expect(wrapper.vm.admin.departamento).toBe('Servicios Externos')
		expect(wrapper.vm.reportes).toHaveLength(4)
	})

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

	it('solo ofrece los estados Pendiente, Finalizado y Rechazado', () => {
		const botones = wrapper.findAll('.estado-btn')
		expect(botones).toHaveLength(3)
		expect(botones.map((b) => b.text())).toEqual([
			expect.stringContaining('Pendiente'),
			expect.stringContaining('Finalizado'),
			expect.stringContaining('Rechazado'),
		])
	})

	it('filtra reportes por Pendiente, Finalizado y Rechazado desde los botones de estado', async () => {
		for (const [estado, folio] of [
			['Pendiente', 'ABC123'],
			['Finalizado', 'LMN321'],
			['Rechazado', 'QWE456'],
		]) {
			const boton = wrapper.findAll('.estado-btn').find((b) => b.text().includes(estado))!
			await boton.trigger('click')
			expect(wrapper.vm.filtros.estado).toBe(estado)
			expect(wrapper.findAll('tbody tr.fila-datos')).toHaveLength(1)
			expect(wrapper.find('tbody tr.fila-datos').text()).toContain(folio)
		}
	})

	it('rechaza un reporte desde Ver detalle', async () => {
		wrapper.vm.filtros.estado = ''
		await wrapper.vm.$nextTick()
		await wrapper.find('.btn-accion').trigger('click') // botón "Ver detalle"
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.modal-card').text()).toContain('Rechazar Reporte')

		await botonDelModal('Rechazar Reporte')!.trigger('click')
		await vi.waitFor(() =>
			expect(db.updateEq).toHaveBeenCalledWith('detalle_reporte', 'folio', 'EXT-BAS-20260915-001-ABC123', { estado_id: 3 }),
		)
	})

	it('devuelve un reporte rechazado a Pendiente', async () => {
		wrapper.vm.filtros.estado = 'Rechazado'
		await wrapper.vm.$nextTick()
		await wrapper.find('.btn-accion').trigger('click') // botón "Ver detalle"
		await wrapper.vm.$nextTick()

		const botonDevolver = botonDelModal('Devolver a Pendiente')
		expect(botonDevolver).toBeDefined()
		await botonDevolver!.trigger('click')

		await vi.waitFor(() =>
			expect(db.updateEq).toHaveBeenCalledWith('detalle_reporte', 'folio', 'EXT-SEG-20260913-003-QWE456', { estado_id: 1 }),
		)
	})

	it('finaliza un reporte pendiente desde la tabla', async () => {
		await wrapper.find('button[title="Finalizar reporte"]').trigger('click')
		await flushPromises()
		expect(db.updateEq).toHaveBeenCalledWith('detalle_reporte', 'folio', 'EXT-BAS-20260915-001-ABC123', { estado_id: 4 })
	})

	it('cierra sesión y redirige al inicio', async () => {
		await wrapper.vm.cerrarSesion()
		expect(localStorage.getItem('userSession')).toBeNull()
		expect(pushMock).toHaveBeenCalledWith('/')
	})
})