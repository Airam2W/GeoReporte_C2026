import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Swal from 'sweetalert2'
import PanelJefe from '@/views/PanelJefe.vue'
import EvidenciaReporteModal from '@/components/EvidenciaReporteModal.vue'
import * as db from '@/services/supabaseController'
import { redireccionarUsuario } from '@/logic/redirectUser'
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

// Evita cargar el router real, el indicador de carga, el PDF y el correo
vi.mock('@/logic/redirectUser', () => ({ redireccionarUsuario: vi.fn() }))
vi.mock('@/composable/useCargando', () => ({
	useCargando: () => ({ mostrarCargando: vi.fn(), ocultarCargando: vi.fn() }),
}))
vi.mock('@/logic/reportePdf', () => ({ generarPdfReporte: vi.fn() }))
vi.mock('@/services/gmailController', () => ({
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
	{
		// Pertenece a otro jefe: no debe aparecer
		folio: 'JEF-OTR-20260912-004-OTR999',
		domicilio: 'Calle Allende 30',
		created_at: '2026-09-12T12:00:00Z',
		problemas: { id: 1, nombre: 'Bache' },
		detalle_reporte: {
			estado_id: 7,
			fecha_inicio: '2026-09-12T13:00:00Z',
			fecha_cierre: null,
			jefe_id: 99,
			supervisor_id: 20,
			estadoreporte: { estado: 'En Proceso' },
			supervisores: { usuarios: { nombre: 'Ana', apellido_p: 'García', apellido_m: 'López' } },
		},
		historial_reporte: [],
	},
]

describe('Pruebas del panel del jefe', () => {
	let wrapper: VueWrapper<any>

	beforeEach(async () => {
		vi.clearAllMocks()

		// La sesión vive en el token "userToken" y el panel exige tipo_id === 4
		crearStorage({
			userToken: crearToken({
				id: 40, id_jefe: 30, nombre: 'Jefe de Servicios', departamento_id: 1, tipo_id: 4,
			}),
		})

		vi.mocked(db.esperarUsuario).mockResolvedValue('token-de-prueba')

		vi.mocked(db.obtenerProblemasPorDepartamentoID).mockResolvedValue({
			data: [
				{ id: 1, nombre: 'Bache', departamento_id: 1 },
				{ id: 2, nombre: 'Alumbrado', departamento_id: 1 },
				{ id: 3, nombre: 'Drenaje', departamento_id: 1 },
			],
			error: null,
		})
		vi.mocked(db.obtenerDepartamentosInternosPorID).mockResolvedValue({
			data: [{ id: 1, nombre: 'Servicios Publicos' }],
			error: null,
		})
		vi.mocked(db.obtenerTitulos).mockImplementation(async (categoria: any) => {
			if (categoria === 3) return { data: [{ id: 9, nombre: 'Finalizacion' }], error: null }
			if (categoria === 4) return { data: [{ id: 20, nombre: 'Avance parcial' }], error: null }
			return { data: [], error: null }
		})
		vi.mocked(db.obtenerReportesJefe).mockImplementation(async () => ({
			data: structuredClone(reportesMock),
			error: null,
		}))
		vi.mocked(db.uploadFoto).mockResolvedValue({ data: {}, error: null })
		vi.mocked(db.getPublicUrl).mockResolvedValue({
			data: { publicUrl: 'https://example.com/avance.jpg' },
			error: null,
		})
		vi.mocked(db.crearHistorialReporteConFoto).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.actualizarEstadoReporte).mockResolvedValue({ data: null, error: null })

		wrapper = mount(PanelJefe)
		await flushPromises()
	})

	afterEach(() => wrapper.unmount())

	const datosEvidencia = () => ({
		titulo_id: 20,
		tituloNombre: 'Avance parcial',
		notas: 'Se avanzó en la obra',
		archivo: new File(['foto'], 'avance.jpg', { type: 'image/jpeg' }),
	})

	it('PJ-01 carga únicamente los reportes asignados al jefe', () => {
		expect(wrapper.vm.cargando).toBe(false)
		expect(wrapper.vm.reportes).toHaveLength(3)
		expect(wrapper.vm.reportes.map((r: any) => r.folio)).not.toContain('JEF-OTR-20260912-004-OTR999')
		expect(wrapper.find('.content-header p').text()).toBe('Servicios Publicos')
		expect(db.obtenerReportesJefe).toHaveBeenCalledWith(1)
		expect(db.obtenerProblemasPorDepartamentoID).toHaveBeenCalledWith(1)
	})

	it('PJ-02 muestra por defecto solo los reportes En Proceso', () => {
		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(2)
	})

	it('PJ-03 filtra reportes por estado desde los botones', async () => {
		const boton = wrapper.findAll('.estado-btn').find((b) => b.text().includes('Pendiente de Finalización'))!
		await boton.trigger('click')

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('QWE456')
	})

	it('PJ-04 filtra un reporte por folio', async () => {
		wrapper.vm.filtros.busqueda = 'XYZ789'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('XYZ789')
	})

	it('PJ-05 filtra un reporte por domicilio', async () => {
		wrapper.vm.filtros.busqueda = 'Rosales'
		wrapper.vm.filtros.estado = 'Pendiente de Finalización'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('Calle Rosales 12')
	})

	it('PJ-06 filtra reportes por fecha de creación', async () => {
		wrapper.vm.filtros.fecha = '2026-09-15'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('ABC123')
	})

	it('PJ-07 filtra reportes por tipo de problema', async () => {
		wrapper.vm.filtros.problema = '2'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('XYZ789')
	})

	it('PJ-08 en Pendiente de Finalización solo muestra el botón de espera', async () => {
		wrapper.vm.filtros.estado = 'Pendiente de Finalización'
		await wrapper.vm.$nextTick()

		expect(wrapper.find('button[title="Esperando la confirmación del supervisor"]').exists()).toBe(true)
		expect(wrapper.find('button[title="Actualizar avance"]').exists()).toBe(false)
		expect(wrapper.find('button[title="Enviar petición de finalización"]').exists()).toBe(false)
	})

	it('PJ-09 envía un avance con foto sin cambiar el estado del reporte', async () => {
		await wrapper.find('button[title="Actualizar avance"]').trigger('click')
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent(EvidenciaReporteModal).props('folio')).toBe('JEF-BAC-20260915-001-ABC123')

		wrapper.findComponent(EvidenciaReporteModal).vm.$emit('confirm', datosEvidencia())
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Enviar avance?' }))
		expect(db.uploadFoto).toHaveBeenCalledWith(
			expect.stringContaining('JEF-BAC-20260915-001-ABC123/'),
			expect.any(File),
			'fotos_avances',
		)
		expect(db.crearHistorialReporteConFoto).toHaveBeenCalledWith('JEF-BAC-20260915-001-ABC123', {
			titulo_id: 20,
			notas: 'Se avanzó en la obra',
			foto_url: 'https://example.com/avance.jpg',
			categoria_historial_id: 4,
		})
		expect(db.actualizarEstadoReporte).not.toHaveBeenCalled()
	})

	it('PJ-10 envía la petición de finalización y pasa el reporte a estado 8', async () => {
		await wrapper.find('button[title="Enviar petición de finalización"]').trigger('click')
		await wrapper.vm.$nextTick()

		wrapper.findComponent(EvidenciaReporteModal).vm.$emit('confirm', datosEvidencia())
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Enviar finalización?' }))
		expect(db.crearHistorialReporteConFoto).toHaveBeenCalledWith(
			'JEF-BAC-20260915-001-ABC123',
			expect.objectContaining({ categoria_historial_id: 3 }),
		)
		expect(db.actualizarEstadoReporte).toHaveBeenCalledWith('JEF-BAC-20260915-001-ABC123', { estado_id: 8 })
	})

	it('PJ-11 no registra nada si se cancela la confirmación', async () => {
		vi.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: false } as any)

		await wrapper.find('button[title="Actualizar avance"]').trigger('click')
		wrapper.findComponent(EvidenciaReporteModal).vm.$emit('confirm', datosEvidencia())
		await flushPromises()

		expect(db.uploadFoto).not.toHaveBeenCalled()
		expect(db.crearHistorialReporteConFoto).not.toHaveBeenCalled()
	})

	it('PJ-12 no registra el historial si falla la subida de la foto', async () => {
		vi.mocked(db.uploadFoto).mockResolvedValueOnce({ data: null, error: { message: 'fallo' } })

		await wrapper.find('button[title="Actualizar avance"]').trigger('click')
		wrapper.findComponent(EvidenciaReporteModal).vm.$emit('confirm', datosEvidencia())
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith('Error', 'No se pudo subir la imagen.', 'error')
		expect(db.crearHistorialReporteConFoto).not.toHaveBeenCalled()
	})

	it('PJ-13 cierra sesión, elimina el token y redirige al inicio', async () => {
		await wrapper.vm.cerrarSesion()
		expect(localStorage.getItem('userToken')).toBeNull()
		expect(pushMock).toHaveBeenCalledWith('/')
	})

	it('PJ-14 redirige al inicio si no hay sesión', async () => {
		crearStorage({})

		const w = mount(PanelJefe)
		await flushPromises()

		expect(pushMock).toHaveBeenCalledWith('/')
		w.unmount()
	})

	it('PJ-15 niega el acceso si el token no es de jefe', async () => {
		crearStorage({ userToken: crearToken({ id: 2, nombre: 'Administrador', departamento_id: 1, tipo_id: 2 }) })

		const w = mount(PanelJefe)
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith('Acceso Denegado', expect.any(String), 'error')
		expect(redireccionarUsuario).toHaveBeenCalled()
		w.unmount()
	})
})