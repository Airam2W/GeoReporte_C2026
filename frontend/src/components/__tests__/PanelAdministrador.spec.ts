import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Swal from 'sweetalert2'
import PanelAdministrador from '@/views/PanelAdministrador.vue'
import RechazarReporteModal from '@/components/RechazarReporteModal.vue'
import AsignarReporteModal from '@/components/AsignarReporteModal.vue'
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
	enviarCorreoRechazoReporte: vi.fn().mockResolvedValue({ ok: true }),
	enviarCorreoTurnadoReporte: vi.fn().mockResolvedValue({ ok: true }),
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

const ESTADOS: Record<number, string> = {
	1: 'Pendiente', 2: 'En Revisión', 3: 'Rechazado', 4: 'Finalizado', 5: 'Turnado', 6: 'Devuelto', 7: 'En Proceso',
}

const reportesMock = [
	{
		folio: 'ALU-BAC-20260915-001-ABC123', descripcion: 'Reporte de prueba', nombre: 'Angel',
		telefono: '6671234567', domicilio: 'Av. Álvaro Obregón 450', referencias: 'Frente al parque',
		foto_url: null, created_at: '2026-09-15T12:00:00Z', problemas: { id: 1, nombre: 'Bache' },
		detalle_reporte: { estado_id: 1, estadoreporte: { estado: 'Pendiente' } }, historial_reporte: [],
	},
	{
		folio: 'ALU-LUZ-20260914-002-XYZ789', descripcion: 'Falla de iluminación', nombre: 'Maria',
		telefono: '6679876543', domicilio: 'Blvd. Universitarios 100', referencias: '', foto_url: null,
		created_at: '2026-09-14T12:00:00Z', problemas: { id: 2, nombre: 'Falla de iluminacion' },
		detalle_reporte: { estado_id: 2, estadoreporte: { estado: 'En Revisión' } }, historial_reporte: [],
	},
	{
		folio: 'ALU-DRE-20260913-003-QWE456', descripcion: 'Drenaje tapado', nombre: 'Luis',
		telefono: '6675550000', domicilio: 'Calle Rosales 12', referencias: '', foto_url: null,
		created_at: '2026-09-13T12:00:00Z', problemas: { id: 3, nombre: 'Drenaje' },
		detalle_reporte: { estado_id: 4, estadoreporte: { estado: 'Finalizado' } }, historial_reporte: [],
	},
	{
		folio: 'ALU-DEV-20260911-006-DEV123', descripcion: 'Reporte devuelto', nombre: 'Rosa',
		telefono: '6672222222', domicilio: 'Calle Morelos 15', referencias: '', foto_url: null,
		created_at: '2026-09-11T12:00:00Z', problemas: { id: 1, nombre: 'Bache' },
		detalle_reporte: { estado_id: 6, estadoreporte: { estado: 'Devuelto' } }, historial_reporte: [],
	},
	{
		folio: 'ALU-TUR-20260910-007-TUR123', descripcion: 'Reporte turnado', nombre: 'Jorge',
		telefono: '6673333333', domicilio: 'Calle Juárez 20', referencias: '', foto_url: null,
		created_at: '2026-09-10T12:00:00Z', problemas: { id: 1, nombre: 'Bache' },
		detalle_reporte: { estado_id: 5, estadoreporte: { estado: 'Turnado' } }, historial_reporte: [],
	},
	{
		folio: 'ALU-REC-20260909-008-REC123', descripcion: 'Reporte rechazado', nombre: 'Elena',
		telefono: '6674444444', domicilio: 'Calle Hidalgo 25', referencias: '', foto_url: null,
		created_at: '2026-09-09T12:00:00Z', problemas: { id: 1, nombre: 'Bache' },
		detalle_reporte: { estado_id: 3, estadoreporte: { estado: 'Rechazado' } }, historial_reporte: [],
	},
	{
		// Estados 7 y 8 se muestran como "En Proceso"
		folio: 'ALU-PRO-20260908-009-PRO123', descripcion: 'Reporte en proceso', nombre: 'Pedro',
		telefono: '6678888888', domicilio: 'Calle Allende 30', referencias: '', foto_url: null,
		created_at: '2026-09-08T12:00:00Z', problemas: { id: 3, nombre: 'Drenaje' },
		detalle_reporte: {
			estado_id: 7, supervisor_id: 20, jefe_id: 30, estadoreporte: { estado: 'En Proceso' },
			supervisores: { usuarios: { nombre: 'Ana', apellido_p: 'García', apellido_m: 'López' } },
			jefes: { usuarios: { nombre: 'Luis', apellido_p: 'Soto', apellido_m: '' } },
		},
		historial_reporte: [],
	},
]

describe('Pruebas del panel del administrador', () => {
	let wrapper: VueWrapper<any>
	let reportesEstado: any[]

	beforeEach(async () => {
		vi.clearAllMocks()
		reportesEstado = structuredClone(reportesMock)

		// La sesión vive en el token "userToken" y el panel exige tipo_id === 2
		crearStorage({
			userToken: crearToken({ id: 1, nombre: 'Administrador', departamento_id: 1, tipo_id: 2 }),
		})

		vi.mocked(db.esperarUsuario).mockResolvedValue('token-de-prueba')

		// Catálogos
		vi.mocked(db.obtenerProblemasPorDepartamentoID).mockResolvedValue({
			data: [{ id: 1, nombre: 'Bache', departamento_id: 1 }, { id: 2, nombre: 'Falla de iluminacion', departamento_id: 1 }],
			error: null,
		})
		vi.mocked(db.obtenerDepartamentosInternosPorID).mockResolvedValue({
			data: [{ id: 1, nombre: 'Servicios Publicos' }],
			error: null,
		})
		vi.mocked(db.obtenerTodosDepartamentosInternos).mockResolvedValue({
			data: [{ id: 1, nombre: 'Servicios Publicos' }, { id: 2, nombre: 'Obras Publicas', estado: 'Alta' }],
			error: null,
		})
		vi.mocked(db.obtenerTodosDepartamentosExternos).mockResolvedValue({
			data: [{ id: 10, departamento: 'Proveedor Externo', estado: 'Alta' }],
			error: null,
		})
		vi.mocked(db.obtenerSupervisoresPorDepartamentoID).mockResolvedValue({
			data: [{
				id: 20,
				usuarios: { nombre: 'Ana', apellido_p: 'García', apellido_m: 'López', estadoadministrativo: 'Alta' },
			}],
			error: null,
		})
		vi.mocked(db.obtenerTodosJefes).mockResolvedValue({
			data: [{ id: 30, supervisor_id: 20, usuarios: { nombre: 'Luis', apellido_p: 'Soto', apellido_m: '' } }],
			error: null,
		})
		vi.mocked(db.obtenerTitulos).mockImplementation(async (categoria: any) => {
			if (categoria === 2) return { data: [{ id: 7, nombre: 'No procedente' }], error: null }
			if (categoria === 7) return { data: [{ id: 11, nombre: 'Interno' }, { id: 12, nombre: 'Externo' }], error: null }
			return { data: [], error: null }
		})

		// Reportes
		vi.mocked(db.obtenerReportesPorDepartamentoInternoID).mockImplementation(async () => ({
			data: structuredClone(reportesEstado),
			error: null,
		}))
		vi.mocked(db.obtenerEstadoIDPorNombre).mockImplementation(async (estado: string) => ({
			data: { id: Object.entries(ESTADOS).find(([, nombre]) => nombre === estado)?.[0] ? Number(Object.entries(ESTADOS).find(([, nombre]) => nombre === estado)![0]) : null },
			error: null,
		}))
		vi.mocked(db.crearHistorialReporte).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.actualizarSupervisorEstadoReporte).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.actualizarEstadoReporte).mockImplementation(async (folio: string, payload: any) => {
			const reporte = reportesEstado.find((item) => item.folio === folio)
			if (reporte && 'estado_id' in payload) {
				reporte.detalle_reporte.estado_id = payload.estado_id
				reporte.detalle_reporte.estadoreporte.estado = ESTADOS[payload.estado_id]
			}
			return { data: null, error: null }
		})

		wrapper = mount(PanelAdministrador)
		await flushPromises()
	})

	afterEach(() => wrapper.unmount())

	it('carga catálogos y reportes del departamento', () => {
		expect(wrapper.vm.cargando).toBe(false)
		expect(wrapper.vm.reportes).toHaveLength(7)
		expect(wrapper.find('.content-header p').text()).toBe('Servicios Publicos')
		expect(db.obtenerReportesPorDepartamentoInternoID).toHaveBeenCalledWith(1)
		expect(db.obtenerProblemasPorDepartamentoID).toHaveBeenCalledWith(1)
		expect(db.obtenerSupervisoresPorDepartamentoID).toHaveBeenCalledWith(1)
	})

	it('filtra por folio, ciudadano, teléfono, domicilio, fecha y problema', async () => {
		wrapper.vm.filtros.estado = ''
		for (const [filtro, esperado] of [['busqueda', 'ABC123'], ['busqueda', 'Maria'], ['busqueda', '6671234567'], ['busqueda', 'Rosales'], ['fecha', '2026-09-15'], ['problema', '2']]) {
			wrapper.vm.filtros.busqueda = ''
			wrapper.vm.filtros.fecha = ''
			wrapper.vm.filtros.problema = ''
			wrapper.vm.filtros[filtro] = esperado
			await wrapper.vm.$nextTick()
			expect(wrapper.findAll('tbody tr.fila-datos')).toHaveLength(1)
		}
	})

	it('filtra por todos los estados disponibles', async () => {
		const estadosEsperados = [
			['Pendiente', 'ABC123'],
			['En Revisión', 'XYZ789'],
			['En Proceso', 'PRO123'],
			['Devuelto', 'DEV123'],
			['Turnado', 'TUR123'],
			['Finalizado', 'QWE456'],
			['Rechazado', 'REC123'],
		]

		for (const [estado, folio] of estadosEsperados) {
			wrapper.vm.filtros.estado = estado
			await wrapper.vm.$nextTick()

			const filas = wrapper.findAll('tbody tr.fila-datos')

			expect(filas).toHaveLength(1)
			expect(filas[0].text()).toContain(folio)
		}
	})

	it('en "En Proceso" muestra las columnas de supervisor y jefe asignados', async () => {
		wrapper.vm.filtros.estado = 'En Proceso'
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('SUPERVISOR ASIGNADO')
		expect(wrapper.text()).toContain('JEFE ASIGNADO')
		const fila = wrapper.find('tbody tr.fila-datos')
		expect(fila.text()).toContain('Ana García López')
		expect(fila.text()).toContain('Luis Soto')
	})

	it('abre el detalle y navega a Crear Reporte', async () => {
		await wrapper.find('.btn-ver').trigger('click')
		expect(wrapper.vm.reporteActivo.folio).toBe('ALU-BAC-20260915-001-ABC123')
		await wrapper.find('.fix-right').trigger('click')
		expect(pushMock).toHaveBeenCalledWith('/reporte')
	})

	it('rechaza un reporte mediante el modal de motivo y notas', async () => {
		// Paso 1: abre el modal de rechazo
		wrapper.vm.rechazarReporte('ALU-BAC-20260915-001-ABC123')
		await wrapper.vm.$nextTick()

		// Paso 2: el modal emite "confirm" con el motivo y las notas
		wrapper.findComponent(RechazarReporteModal).vm.$emit('confirm', {
			titulo_id: 7,
			notas: 'No procede',
			tituloNombre: 'No procedente',
		})
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Rechazar reporte?' }))
		expect(db.crearHistorialReporte).toHaveBeenCalledWith('ALU-BAC-20260915-001-ABC123', {
			categoria_historial_id: 2,
			titulo_id: 7,
			notas: 'No procede',
		})
		expect(db.actualizarEstadoReporte).toHaveBeenCalledWith('ALU-BAC-20260915-001-ABC123', { estado_id: 3 })
	})

	it('asigna un reporte a un supervisor', async () => {
		wrapper.vm.asignarReporte('ALU-BAC-20260915-001-ABC123')
		await wrapper.vm.$nextTick()

		wrapper.findComponent(AsignarReporteModal).vm.$emit('confirm', {
			supervisor_id: 20,
			supervisorNombre: 'Ana García López',
		})
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: '¿Asignar reporte?' }))
		expect(db.actualizarSupervisorEstadoReporte).toHaveBeenCalledWith('ALU-BAC-20260915-001-ABC123', {
			supervisor_id: 20,
			estado_id: 2,
		})
	})

	it('devuelve un reporte finalizado a Pendiente', async () => {
		wrapper.vm.filtros.estado = 'Finalizado'
		await wrapper.vm.$nextTick()
		await wrapper.find('.btn-devolver').trigger('click')
		await flushPromises()

		expect(db.obtenerEstadoIDPorNombre).toHaveBeenCalledWith('Pendiente')
		expect(db.actualizarEstadoReporte).toHaveBeenCalledWith('ALU-DRE-20260913-003-QWE456', { estado_id: 1 })
	})

	it('cierra sesión, elimina el token y redirige al inicio', async () => {
		await wrapper.vm.cerrarSesion()
		expect(localStorage.getItem('userToken')).toBeNull()
		expect(pushMock).toHaveBeenCalledWith('/')
	})

	it('redirige al inicio si no hay sesión', async () => {
		crearStorage({})

		const w = mount(PanelAdministrador)
		await flushPromises()

		expect(pushMock).toHaveBeenCalledWith('/')
		w.unmount()
	})

	it('niega el acceso si el token no es de administrador', async () => {
		crearStorage({ userToken: crearToken({ id: 3, nombre: 'Supervisor', departamento_id: 1, tipo_id: 3 }) })

		const w = mount(PanelAdministrador)
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith('Acceso Denegado', expect.any(String), 'error')
		expect(redireccionarUsuario).toHaveBeenCalled()
		w.unmount()
	})
})