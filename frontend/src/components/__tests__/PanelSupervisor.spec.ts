import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Swal from 'sweetalert2'
import PanelSupervisor from '@/views/PanelSupervisor.vue'
import AsignarJefeModal from '@/components/AsignarJefeModal.vue'
import DevolucionReporteModal from '@/components/DevolucionReporteModal.vue'
import FinalizarReporteModal from '@/components/FinalizarReporteModal.vue'
import RetroalimentacionFotoAIModal from '@/components/RetroalimentacionFotoAIModal.vue'
import * as db from '@/services/supabaseController'
import { redireccionarUsuario } from '@/logic/redirectUser'
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

// Evita cargar el router real, el indicador de carga, el PDF y el correo
vi.mock('@/logic/redirectUser', () => ({ redireccionarUsuario: vi.fn() }))
vi.mock('@/composable/useCargando', () => ({
	useCargando: () => ({ mostrarCargando: vi.fn(), ocultarCargando: vi.fn() }),
}))
vi.mock('@/logic/reportePdf', () => ({ generarPdfReporte: vi.fn() }))
vi.mock('@/services/gmailController', () => ({
	enviarCorreoFinalizacionReporte: vi.fn().mockResolvedValue({ ok: true }),
	enviarCorreoReportePDF: vi.fn().mockResolvedValue({ ok: true }),
}))

// JWT falso: solo importa el payload. Sin acentos en el payload (atob + decodeURIComponent los rompe)
const crearToken = (payload: object) => `cabecera.${btoa(JSON.stringify(payload))}.firma`

const crearStorage = (inicial: Record<string, string>) => {
	const storage = new Map<string, string>(Object.entries(inicial))
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => storage.set(key, value),
		removeItem: (key: string) => storage.delete(key),
	})
	return storage
}

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
	{
		// Estado 8: el jefe ya envió la finalización y el supervisor debe resolverla
		folio: 'SUP-OBR-20260912-004-FIN123', descripcion: 'Obra terminada', nombre: 'Sofia',
		telefono: '6674440000', domicilio: 'Calle Allende 30', referencias: '', foto_url: null,
		created_at: '2026-09-12T12:00:00Z', problemas: { id: 3, nombre: 'Drenaje' },
		detalle_reporte: {
			estado_id: 8, jefe_id: 31, supervisor_id: 20,
			estadoreporte: { estado: 'Pendiente de Finalización' },
			jefes: { usuarios: { nombre: 'Marta', apellido_p: 'Ruiz', apellido_m: '' } },
		},
		historial_reporte: [
			{
				categoria_historial_id: 3,
				fecha: '2026-09-12T15:00:00Z',
				notas: 'Trabajo terminado',
				titulo: { nombre: 'Finalización' },
				foto_url: 'https://example.com/foto-final.jpg',
			},
		],
	},
]

describe('Pruebas del panel del supervisor', () => {
	let wrapper: VueWrapper<any>
	let reportesEstado: any[]

	beforeEach(async () => {
		vi.clearAllMocks()
		reportesEstado = structuredClone(reportesMock)

		// La sesión vive en el token "userToken" y el panel exige tipo_id === 3
		crearStorage({
			userToken: crearToken({
				id: 20, id_supervisor: 20, nombre: 'Supervisor', departamento_id: 1, tipo_id: 3,
			}),
		})

		vi.mocked(db.esperarUsuario).mockResolvedValue('token-de-prueba')

		// Catálogos
		vi.mocked(db.obtenerProblemasPorDepartamentoID).mockResolvedValue({
			data: [{ id: 1, nombre: 'Bache' }, { id: 2, nombre: 'Alumbrado' }],
			error: null,
		})
		vi.mocked(db.obtenerDepartamentosInternosPorID).mockResolvedValue({
			data: [{ id: 1, nombre: 'Servicios Publicos' }],
			error: null,
		})
		vi.mocked(db.obtenerJefesPorSupervisor).mockResolvedValue({
			data: [{
				id: 30,
				usuarios: { nombre: 'Luis', apellido_p: 'García', apellido_m: 'Soto', estadoadministrativo: 'Alta' },
			}],
			error: null,
		})
		vi.mocked(db.obtenerTitulos).mockResolvedValue({
			data: [{ id: 8, nombre: 'Información incorrecta' }],
			error: null,
		})
		vi.mocked(db.obtenerCategoriaHistorial).mockResolvedValue({
			data: [{ id: 3, nombre: 'Finalización' }],
			error: null,
		})
		vi.mocked(db.obtenerTodosDepartamentosInternos).mockResolvedValue({
			data: [{ id: 1, nombre: 'Servicios Publicos' }, { id: 2, nombre: 'Obras Publicas' }],
			error: null,
		})

		// Reportes y acciones
		vi.mocked(db.obtenerReportesSupervisor).mockImplementation(async () => ({
			data: structuredClone(reportesEstado),
			error: null,
		}))
		vi.mocked(db.obtenerEstadoIDPorNombre).mockImplementation(async (estado: string) => ({
			data: { id: ({ Devuelto: 6 } as Record<string, number>)[estado] ?? null },
			error: null,
		}))
		vi.mocked(db.crearHistorialReporte).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.crearHistorialReporteConFoto).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.actualizarFotoDepartamentoReporte).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.actualizarEstadoReporte).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.actualizarEstadoReporteConFechaCierre).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.actualizarEstadoReporteQuitarSupervisor).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.actualizarEstadoReporteConJefeFechaInicio).mockResolvedValue({ data: null, error: null })

		wrapper = mount(PanelSupervisor)
		await flushPromises()
	})

	afterEach(() => wrapper.unmount())

	it('PS-01 carga únicamente los reportes asignados al supervisor', () => {
		expect(wrapper.vm.cargando).toBe(false)
		expect(wrapper.vm.reportes).toHaveLength(3)
		expect(wrapper.vm.reportes.map((reporte: any) => reporte.folio)).toEqual([
			'SUP-BAC-20260915-001-ABC123',
			'SUP-LUZ-20260914-002-XYZ789',
			'SUP-OBR-20260912-004-FIN123',
		])
		expect(wrapper.find('.content-header p').text()).toBe('Servicios Publicos')
		expect(db.obtenerReportesSupervisor).toHaveBeenCalledWith(1)
		expect(db.obtenerJefesPorSupervisor).toHaveBeenCalledWith(20)
	})

	it('PS-02 muestra por defecto solo los reportes Pendientes de Asignación', () => {
		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('ABC123')
	})

	it('PS-03 filtra reportes por estado desde los botones', async () => {
		for (const [estado, folio] of [
			['Asignado', 'XYZ789'],
			['Pendiente de Finalización', 'FIN123'],
			['Pendiente de Asignación', 'ABC123'],
		]) {
			const boton = wrapper.findAll('.estado-btn').find((b) => b.text().includes(estado))!
			await boton.trigger('click')
			expect(wrapper.vm.filtros.estado).toBe(estado)
			expect(wrapper.findAll('tbody tr.fila-datos')).toHaveLength(1)
			expect(wrapper.find('tbody tr.fila-datos').text()).toContain(folio)
		}
	})

	it('PS-04 filtra reportes por búsqueda (folio y domicilio), fecha, problema y jefe', async () => {
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

	it('PS-05 filtra reportes sin jefe asignado', async () => {
		wrapper.vm.filtros.estado = ''
		wrapper.vm.filtros.jefe = 'SIN_ASIGNAR'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('ABC123')
	})

	it('PS-06 rechaza un reporte y actualiza su estado', async () => {
		await wrapper.vm.rechazarReporte('SUP-BAC-20260915-001-ABC123')

		expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Rechazar reporte?' }))
		expect(db.actualizarEstadoReporte).toHaveBeenCalledWith('SUP-BAC-20260915-001-ABC123', { estado_id: 3 })
	})

	it('PS-07 devuelve un reporte con motivo y notas', async () => {
		// Paso 1: el botón abre el modal de devolución
		await wrapper.find('.btn-devolver').trigger('click')
		await wrapper.vm.$nextTick()

		// Paso 2: el modal emite "confirm" con el motivo y las notas
		wrapper.findComponent(DevolucionReporteModal).vm.$emit('confirm', {
			titulo_id: 8,
			notas: 'Requiere mayor información',
		})
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Devolver este reporte?' }))
		expect(db.obtenerEstadoIDPorNombre).toHaveBeenCalledWith('Devuelto')
		expect(db.crearHistorialReporte).toHaveBeenCalledWith('SUP-BAC-20260915-001-ABC123', {
			categoria_historial_id: 1,
			titulo_id: 8,
			notas: 'Requiere mayor información',
		})
		expect(db.actualizarEstadoReporteQuitarSupervisor).toHaveBeenCalledWith('SUP-BAC-20260915-001-ABC123', {
			estado_id: 6,
			supervisor_id: null,
		})
	})

	it('PS-08 asigna un reporte a un jefe desde la acción del reporte', async () => {
		const botonAsignar = wrapper.find('.btn-asignar')
		expect(botonAsignar.attributes('title')).toBe('Asignar jefe')

		// Paso 1: el botón abre el modal "Asignar Jefe"
		await botonAsignar.trigger('click')
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent(AsignarJefeModal).props('folio')).toBe('SUP-BAC-20260915-001-ABC123')

		// Paso 2: el modal emite "confirm" con el jefe elegido
		wrapper.findComponent(AsignarJefeModal).vm.$emit('confirm', {
			jefe_id: 30,
			jefeNombre: 'Luis García Soto',
		})
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Asignar reporte?' }))
		expect(db.actualizarEstadoReporteConJefeFechaInicio).toHaveBeenCalledWith('SUP-BAC-20260915-001-ABC123', {
			jefe_id: 30,
			estado_id: 7,
			fecha_inicio: expect.any(String),
		})
		// Carga inicial + recarga tras asignar
		expect(db.obtenerReportesSupervisor).toHaveBeenCalledTimes(2)
	})

	it('PS-09 pide la retroalimentación de la foto antes de asignar si aún no la tiene', async () => {
		// El reporte tiene foto y todavía no tiene fotoDepartamentoID
		wrapper.vm.reportes[0].foto_url = 'https://example.com/foto.jpg'

		await wrapper.find('.btn-asignar').trigger('click')
		await wrapper.vm.$nextTick()

		// Primero aparece el modal de retroalimentación, no el de asignar
		expect(wrapper.findComponent(RetroalimentacionFotoAIModal).props('visible')).toBe(true)
		expect(wrapper.findComponent(AsignarJefeModal).props('visible')).toBe(false)

		// "Sí, es de mi departamento" (null) guarda el departamento del supervisor y continúa
		wrapper.findComponent(RetroalimentacionFotoAIModal).vm.$emit('confirm', null)
		await flushPromises()

		expect(db.actualizarFotoDepartamentoReporte).toHaveBeenCalledWith('SUP-BAC-20260915-001-ABC123', 1)
		expect(wrapper.findComponent(AsignarJefeModal).props('visible')).toBe(true)
	})

	it('PS-10 acepta la finalización de un reporte', async () => {
		wrapper.vm.filtros.estado = 'Pendiente de Finalización'
		await wrapper.vm.$nextTick()

		await wrapper.find('button[title="Finalizar Reporte"]').trigger('click')
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent(FinalizarReporteModal).props('folio')).toBe('SUP-OBR-20260912-004-FIN123')

		wrapper.findComponent(FinalizarReporteModal).vm.$emit('aceptar', 'Todo correcto')
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Aceptar finalización?' }))
		expect(db.crearHistorialReporteConFoto).toHaveBeenCalledWith('SUP-OBR-20260912-004-FIN123', {
			categoria_historial_id: 5,
			titulo_id: 9,
			notas: 'Todo correcto',
			foto_url: 'https://example.com/foto-final.jpg',
		})
		expect(db.actualizarEstadoReporteConFechaCierre).toHaveBeenCalledWith('SUP-OBR-20260912-004-FIN123', {
			estado_id: 4,
			fecha_cierre: expect.any(String),
		})
	})

	it('PS-11 deniega la finalización y regresa el reporte a Asignado', async () => {
		wrapper.vm.filtros.estado = 'Pendiente de Finalización'
		await wrapper.vm.$nextTick()

		await wrapper.find('button[title="Finalizar Reporte"]').trigger('click')
		await wrapper.vm.$nextTick()

		wrapper.findComponent(FinalizarReporteModal).vm.$emit('denegar', 'Falta terminar')
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Denegar finalización?' }))
		expect(db.crearHistorialReporteConFoto).toHaveBeenCalledWith('SUP-OBR-20260912-004-FIN123', {
			categoria_historial_id: 6,
			titulo_id: 10,
			notas: 'Falta terminar',
			foto_url: 'https://example.com/foto-final.jpg',
		})
		expect(db.actualizarEstadoReporte).toHaveBeenCalledWith('SUP-OBR-20260912-004-FIN123', { estado_id: 7 })
	})

	it('PS-12 navega a Crear Reporte', async () => {
		await wrapper.find('.fix-right').trigger('click')
		expect(pushMock).toHaveBeenCalledWith('/reporte')
	})

	it('PS-13 cierra sesión, elimina el token y redirige al inicio', async () => {
		await wrapper.vm.cerrarSesion()
		expect(localStorage.getItem('userToken')).toBeNull()
		expect(pushMock).toHaveBeenCalledWith('/')
	})

	it('PS-14 redirige al inicio si no hay sesión', async () => {
		crearStorage({})

		const w = mount(PanelSupervisor)
		await flushPromises()

		expect(pushMock).toHaveBeenCalledWith('/')
		w.unmount()
	})

	it('PS-15 niega el acceso si el token no es de supervisor', async () => {
		crearStorage({ userToken: crearToken({ id: 2, nombre: 'Administrador', departamento_id: 1, tipo_id: 2 }) })

		const w = mount(PanelSupervisor)
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith('Acceso Denegado', expect.any(String), 'error')
		expect(redireccionarUsuario).toHaveBeenCalled()
		w.unmount()
	})
})