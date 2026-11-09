import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Swal from 'sweetalert2'
import PanelAdminExterno from '@/views/PanelAdminExterno.vue'
import ReporteDetalleModal from '@/components/ReporteDetalleModal.vue'
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
	enviarCorreoRechazoReporte: vi.fn().mockResolvedValue({ ok: true }),
	enviarCorreoFinalizacionReporte: vi.fn().mockResolvedValue({ ok: true }),
	enviarCorreoReportePDF: vi.fn().mockResolvedValue({ ok: true }),
}))

// JWT falso: solo importa el payload (segunda parte)
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

// 3 = Rechazado, 4 = Finalizado, 5 = Turnado
const ESTADOS: Record<number, string> = { 2: 'En Proceso', 3: 'Rechazado', 4: 'Finalizado', 5: 'Turnado' }

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
		detalle_reporte: { estado_id: 5, estadoreporte: { estado: 'Turnado' }, updated_at: '2026-09-15T12:00:00Z' },
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

		// La sesión vive en el token "userToken" y el panel exige tipo_id === 6
		crearStorage({
			userToken: crearToken({ id: 6, nombre: 'Administrador Externo', departamento_id: 10, tipo_id: 6 }),
		})

		vi.mocked(db.esperarUsuario).mockResolvedValue('token-de-prueba')

		vi.mocked(db.obtenerProblematicasExternasPorID).mockResolvedValue({
			data: [{ id: 1, nombre: 'Bache', nombreamigable: 'Bache en vialidad', departamento_externo_id: 10 }],
			error: null,
		})

		// El nombre del departamento sale de obtenerDepartamentosExternosPorID (arreglo)
		vi.mocked(db.obtenerDepartamentosExternosPorID).mockResolvedValue({
			data: [{ id: 10, departamento: 'Servicios Externos' }],
			error: null,
		})

		vi.mocked(db.obtenerReportesPorDepartamentoExternoID).mockImplementation(async () => ({
			data: structuredClone(reportesEstado),
			error: null,
		}))

		// actualizarEstadoReporte(folio, data) actualiza también el estado simulado
		vi.mocked(db.actualizarEstadoReporte).mockImplementation(async (folio: string, payload: any) => {
			const reporte = reportesEstado.find((item) => item.folio === folio)
			if (reporte && 'estado_id' in payload) {
				reporte.detalle_reporte.estado_id = payload.estado_id
				reporte.detalle_reporte.estadoreporte.estado = ESTADOS[payload.estado_id]
			}
			return { data: null, error: null }
		})

		wrapper = mount(PanelAdminExterno)
		await vi.waitFor(() => expect(wrapper.vm.cargando).toBe(false))
	})

	afterEach(() => wrapper.unmount())

	it('PAE-01 carga el departamento, los problemas y los reportes turnados', () => {
		expect(db.obtenerProblematicasExternasPorID).toHaveBeenCalledWith(10)
		expect(db.obtenerDepartamentosExternosPorID).toHaveBeenCalledWith(10)
		expect(db.obtenerReportesPorDepartamentoExternoID).toHaveBeenCalledWith(10)
		expect(wrapper.vm.admin.departamento).toBe('Servicios Externos')
		expect(wrapper.vm.reportes).toHaveLength(4)
	})

	it('PAE-02 muestra por defecto solo los reportes Turnados', () => {
		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('ABC123')
	})

	it('PAE-03 busca reportes por folio y otras características', async () => {
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

	it('PAE-04 solo ofrece los estados Turnado, Finalizado y Rechazado', () => {
		const botones = wrapper.findAll('.estado-btn')
		expect(botones).toHaveLength(3)
		expect(botones.map((b) => b.text())).toEqual([
			expect.stringContaining('Turnado'),
			expect.stringContaining('Finalizado'),
			expect.stringContaining('Rechazado'),
		])
	})

	it('PAE-05 filtra reportes por Turnado, Finalizado y Rechazado desde los botones de estado', async () => {
		for (const [estado, folio] of [
			['Turnado', 'ABC123'],
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

	it('PAE-06 abre el detalle de un reporte', async () => {
		await wrapper.find('button[title="Ver detalle"]').trigger('click')
		expect(wrapper.vm.modalVisible).toBe(true)
		expect(wrapper.vm.reporteActivo.folio).toBe('EXT-BAS-20260915-001-ABC123')
	})

	it('PAE-07 rechaza un reporte turnado desde la tabla', async () => {
		await wrapper.find('button[title="Rechazar reporte"]').trigger('click')
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Rechazar reporte?' }))
		expect(db.actualizarEstadoReporte).toHaveBeenCalledWith('EXT-BAS-20260915-001-ABC123', { estado_id: 3 })
	})

	it('PAE-08 rechaza un reporte cuando el modal de detalle emite "rechazar"', async () => {
		wrapper.findComponent(ReporteDetalleModal).vm.$emit('rechazar', 'EXT-BAS-20260915-001-ABC123')
		await flushPromises()

		expect(db.actualizarEstadoReporte).toHaveBeenCalledWith('EXT-BAS-20260915-001-ABC123', { estado_id: 3 })
	})

	it('PAE-09 no actualiza el reporte si se cancela la confirmación', async () => {
		vi.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: false } as any)

		await wrapper.find('button[title="Rechazar reporte"]').trigger('click')
		await flushPromises()

		expect(db.actualizarEstadoReporte).not.toHaveBeenCalled()
	})

	it('PAE-10 devuelve un reporte rechazado a Turnado', async () => {
		wrapper.vm.filtros.estado = 'Rechazado'
		await wrapper.vm.$nextTick()

		await wrapper.find('button[title="Devolver a Turnado"]').trigger('click')
		await flushPromises()

		expect(db.actualizarEstadoReporte).toHaveBeenCalledWith('EXT-SEG-20260913-003-QWE456', { estado_id: 5 })
	})

	it('PAE-11 finaliza un reporte turnado desde la tabla', async () => {
		await wrapper.find('button[title="Finalizar reporte"]').trigger('click')
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Devolver a "Finalizado"?' }))
		expect(db.actualizarEstadoReporte).toHaveBeenCalledWith('EXT-BAS-20260915-001-ABC123', { estado_id: 4 })
	})

	it('PAE-12 cierra sesión, elimina el token y redirige al inicio', async () => {
		await wrapper.vm.cerrarSesion()
		expect(localStorage.getItem('userToken')).toBeNull()
		expect(pushMock).toHaveBeenCalledWith('/')
	})

	it('PAE-13 redirige al inicio si no hay sesión', async () => {
		crearStorage({})

		const w = mount(PanelAdminExterno)
		await flushPromises()

		expect(pushMock).toHaveBeenCalledWith('/')
		w.unmount()
	})

	it('PAE-14 niega el acceso si el token no es de administrador externo', async () => {
		crearStorage({ userToken: crearToken({ id: 2, nombre: 'Administrador', departamento_id: 1, tipo_id: 2 }) })

		const w = mount(PanelAdminExterno)
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith('Acceso Denegado', expect.any(String), 'error')
		expect(redireccionarUsuario).toHaveBeenCalled()
		w.unmount()
	})
})