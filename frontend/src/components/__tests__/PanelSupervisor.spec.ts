import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PanelSupervisor from '@/views/PanelSupervisor.vue'
import * as db from '@/services/supabaseController'
import './setup'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<typeof import('vue-router')>()
	return { ...actual, useRouter: () => ({ push: pushMock }) }
})

vi.mock('sweetalert2', () => ({
	default: {
		fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
		mixin: vi.fn().mockReturnValue({ fire: vi.fn().mockResolvedValue(undefined) }),
	},
}))

// El panel mapea el estado a partir del estado_id:
//   2 = Pendiente de Asignación, 7 = Asignado, 8 = Pendiente de Finalización
// y solo muestra los reportes cuyo supervisor_id coincide con id_supervisor (20).
const reportesMock = [
	{
		folio: 'SUP-BAC-20260915-001-ABC123', descripcion: 'Bache frente al parque', nombre: 'Angel',
		telefono: '6671234567', domicilio: 'Av. Álvaro Obregón 450', referencias: 'Frente al parque',
		foto_url: null, created_at: '2026-09-15T12:00:00Z', problemas: { id: 1, nombre: 'Bache' },
		detalle_reporte: {
			estado_id: 2, jefe_id: null, supervisor_id: 20,
			estadoreporte: { estado: 'En Revisión' }, jefes: null,
		},
		historial_reporte: [],
	},
	{
		folio: 'SUP-LUZ-20260914-002-XYZ789', descripcion: 'Luminaria apagada', nombre: 'Maria',
		telefono: '6679876543', domicilio: 'Blvd. Universitarios 100', referencias: '', foto_url: null,
		created_at: '2026-09-14T12:00:00Z', problemas: { id: 2, nombre: 'Alumbrado' },
		detalle_reporte: {
			estado_id: 7, jefe_id: 30, supervisor_id: 20,
			estadoreporte: { estado: 'En Proceso' },
			jefes: { usuarios: { nombre: 'Luis', apellido_p: 'García', apellido_m: 'Soto' } },
		},
		historial_reporte: [],
	},
	{
		// Pertenece a otro supervisor: no debe aparecer
		folio: 'SUP-DRE-20260913-003-QWE456', descripcion: 'Drenaje tapado', nombre: 'Luis',
		telefono: '6675550000', domicilio: 'Calle Rosales 12', referencias: '', foto_url: null,
		created_at: '2026-09-13T12:00:00Z', problemas: { id: 3, nombre: 'Drenaje' },
		detalle_reporte: {
			estado_id: 2, jefe_id: null, supervisor_id: 99,
			estadoreporte: { estado: 'En Revisión' }, jefes: null,
		},
		historial_reporte: [],
	},
]

describe('Pruebas del panel del supervisor', () => {
	let wrapper: VueWrapper<any>
	let reportesEstado: any[]

	beforeEach(async () => {
		vi.clearAllMocks()
		reportesEstado = structuredClone(reportesMock)

		// La sesión ahora vive en "userSession" y el panel exige tipo_id === 3
		const storage = new Map([
			['userSession', JSON.stringify({ id: 20, id_supervisor: 20, nombre: 'Supervisor', departamento_id: 1, tipo_id: 3 })],
		])
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
		})

		vi.mocked(db.esperarUsuario).mockResolvedValue(null)
		vi.mocked(db.selectEq).mockImplementation(async (tabla: string) => {
			if (tabla === 'problemas') {
				return { data: [{ id: 1, nombre: 'Bache' }, { id: 2, nombre: 'Alumbrado' }], error: null }
			}
			if (tabla === 'departamentos') return { data: [{ id: 1, nombre: 'Servicios Publicos' }], error: null }
			if (tabla === 'jefes') {
				return {
					data: [{
						id: 30, usuario_id: 40,
						usuarios: { nombre: 'Luis', apellido_p: 'García', apellido_m: 'Soto', estadoadministrativo: 'Alta' },
					}],
					error: null,
				}
			}
			if (tabla === 'titulo') return { data: [{ id: 8, nombre: 'Información incorrecta' }], error: null }
			if (tabla === 'categoria_historial') return { data: [{ id: 3, nombre: 'Finalización' }], error: null }
			return { data: [], error: null }
		})
		vi.mocked(db.selectEqOrder).mockImplementation(async () => ({ data: structuredClone(reportesEstado), error: null }))
		vi.mocked(db.selectEqSingle).mockImplementation(async (_tabla, _campo, estado: string) => ({
			data: { id: { Devuelto: 6 }[estado] ?? null }, error: null,
		}))
		vi.mocked(db.insert).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.updateEq).mockImplementation(async (_tabla, columna, valor, payload) => {
			const reporte = reportesEstado.find((item) => item[columna] === valor)
			if (reporte) {
				if ('supervisor_id' in payload) reporte.detalle_reporte.supervisor_id = payload.supervisor_id
				if ('estado_id' in payload) reporte.detalle_reporte.estado_id = payload.estado_id
				if ('jefe_id' in payload) reporte.detalle_reporte.jefe_id = payload.jefe_id
			}
			return { data: null, error: null }
		})

		wrapper = mount(PanelSupervisor)
		await flushPromises()
	})

	afterEach(() => wrapper.unmount())

	it('carga únicamente los reportes asignados al supervisor', () => {
		expect(wrapper.vm.cargando).toBe(false)
		expect(wrapper.vm.reportes).toHaveLength(2)
		expect(wrapper.vm.reportes.map((reporte: any) => reporte.folio)).toEqual([
			'SUP-BAC-20260915-001-ABC123',
			'SUP-LUZ-20260914-002-XYZ789',
		])
		expect(wrapper.find('.content-header p').text()).toBe('Servicios Publicos')
	})

	it('muestra por defecto solo los reportes Pendientes de Asignación', () => {
		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('ABC123')
	})

	it('filtra reportes por búsqueda (folio y domicilio), fecha, problema y jefe', async () => {
		// El estado por defecto es "Pendiente de Asignación"; '' muestra todos
		wrapper.vm.filtros.estado = ''
		for (const [filtro, valor] of [
			['busqueda', 'XYZ789'],
			['busqueda', 'Obregón'],
			['busqueda', 'Universitarios'],
			['fecha', '2026-09-15'],
			['problema', '2'],
			['jefe', '30'],
		]) {
			wrapper.vm.filtros.busqueda = ''
			wrapper.vm.filtros.fecha = ''
			wrapper.vm.filtros.problema = ''
			wrapper.vm.filtros.jefe = ''
			wrapper.vm.filtros[filtro] = valor
			await wrapper.vm.$nextTick()
			expect(wrapper.findAll('tbody tr.fila-datos')).toHaveLength(1)
		}
	})

	it('filtra reportes sin jefe asignado', async () => {
		wrapper.vm.filtros.estado = ''
		wrapper.vm.filtros.jefe = 'SIN_ASIGNAR'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('ABC123')
	})

	it('rechaza un reporte y actualiza su estado', async () => {
		await wrapper.vm.rechazarReporte('SUP-BAC-20260915-001-ABC123')

		expect(db.updateEq).toHaveBeenCalledWith(
			'detalle_reporte',
			'folio',
			'SUP-BAC-20260915-001-ABC123',
			{ estado_id: 3 },
		)
	})

	it('devuelve un reporte con motivo y notas', async () => {
		await wrapper.find('.btn-devolver').trigger('click')
		await wrapper.find('#formDevolucion select').setValue('8')
		await wrapper.find('#formDevolucion textarea').setValue('Requiere mayor información')
		await wrapper.find('#formDevolucion').trigger('submit.prevent')
		await flushPromises()

		expect(db.selectEqSingle).toHaveBeenCalledWith('estadoreporte', 'estado', 'Devuelto', ['id'])
		expect(db.insert).toHaveBeenCalledWith('historial_reporte', {
			folio: 'SUP-BAC-20260915-001-ABC123',
			categoria_historial_id: 1,
			titulo_id: 8,
			notas: 'Requiere mayor información',
		})
		expect(db.updateEq).toHaveBeenCalledWith(
			'detalle_reporte',
			'folio',
			'SUP-BAC-20260915-001-ABC123',
			{ estado_id: 6, supervisor_id: null },
		)
	})

	it('asigna un reporte a un jefe desde la acción del reporte', async () => {
		const botonAsignar = wrapper.find('.btn-asignar')
		expect(botonAsignar.attributes('title')).toBe('Asignar jefe')

		// Ahora el botón abre el modal "Asignar Jefe"; la confirmación (Swal) llega al enviarlo
		await botonAsignar.trigger('click')
		await wrapper.find('#formAsignarJefe select').setValue('30')
		await wrapper.find('#formAsignarJefe').trigger('submit.prevent')
		await flushPromises()

		const Swal = (await import('sweetalert2')).default
		expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Asignar reporte?' }))
		expect(db.updateEq).toHaveBeenCalledWith(
			'detalle_reporte',
			'folio',
			'SUP-BAC-20260915-001-ABC123',
			{ jefe_id: 30, estado_id: 7, fecha_inicio: expect.any(String) },
		)
		// Carga inicial + recarga tras asignar
		expect(db.selectEqOrder).toHaveBeenCalledTimes(2)
	})

	it('cierra sesión y redirige al inicio', async () => {
		await wrapper.vm.cerrarSesion()
		expect(localStorage.getItem('userSession')).toBeNull()
		expect(pushMock).toHaveBeenCalledWith('/')
	})
})