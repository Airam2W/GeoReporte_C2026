import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PanelAdministrador from '@/views/PanelAdministrador.vue'
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
]

describe('Pruebas del panel del administrador', () => {
	let wrapper: VueWrapper<any>
	let reportesEstado: any[]

	beforeEach(async () => {
		vi.clearAllMocks()
		reportesEstado = structuredClone(reportesMock)
		const storage = new Map([['adminSession', JSON.stringify({ id: 1, nombre: 'Administrador', departamento_id: 1, tipo_id: 2 })]])
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
		})

		vi.mocked(db.selectEq).mockImplementation(async (tabla: string) => {
			if (tabla === 'problemas') return { data: [{ id: 1, nombre: 'Bache', departamento_id: 1 }, { id: 2, nombre: 'Falla de iluminacion', departamento_id: 1 }], error: null }
		if (tabla === 'departamentos') return { data: [{ id: 1, nombre: 'Servicios Publicos' }], error: null }
		if (tabla === 'supervisores') return { data: [], error: null }
		if (tabla === 'titulo') return { data: [{ id: 7, nombre: 'No procedente' }], error: null }
		return { data: [], error: null }
		})
		vi.mocked(db.selectAll).mockImplementation(async (tabla: string) => ({
			data: tabla === 'departamentos' ? [{ id: 2, nombre: 'Obras Publicas', estado: 'Alta' }] : [{ id: 10, departamento: 'Proveedor Externo', estado: 'Alta' }],
			error: null,
		}))
		vi.mocked(db.selectEqOrder).mockImplementation(async () => ({ data: structuredClone(reportesEstado), error: null }))
		vi.mocked(db.selectEqSingle).mockImplementation(async (_tabla, _campo, estado: string) => ({
			data: { id: { Pendiente: 1, 'En Revisión': 2, Rechazado: 3, Finalizado: 4, Turnado: 5, Devuelto: 6 }[estado] }, error: null,
		}))
		vi.mocked(db.insert).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.updateEq).mockImplementation(async (_tabla, columna, valor, payload) => {
			const reporte = reportesEstado.find((item) => item[columna] === valor)
			if (reporte && 'estado_id' in payload) {
				reporte.detalle_reporte.estado_id = payload.estado_id
				reporte.detalle_reporte.estadoreporte.estado = { 1: 'Pendiente', 2: 'En Revisión', 3: 'Rechazado', 4: 'Finalizado', 5: 'Turnado', 6: 'Devuelto' }[payload.estado_id]
			}
			return { data: null, error: null }
		})

		wrapper = mount(PanelAdministrador)
		await flushPromises()
	})

	afterEach(() => wrapper.unmount())

	it('carga catálogos y reportes del departamento', () => {
		expect(wrapper.vm.cargando).toBe(false)
		expect(wrapper.vm.reportes).toHaveLength(6)
		expect(wrapper.find('.content-header p').text()).toBe('Servicios Publicos')
		expect(db.selectEqOrder).toHaveBeenCalledWith('reportes', 'departamento_id', 1, 'created_at', expect.any(Array), false)
	})

	it('filtra por folio, ciudadano, teléfono, domicilio, fecha y problema', async () => {
		wrapper.vm.filtros.estado = ''
		for (const [filtro, esperado] of [['busqueda', 'Maria'], ['busqueda', '6671234567'], ['busqueda', 'Rosales'], ['fecha', '2026-09-15'], ['problema', '2']]) {
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

	it('abre el detalle y navega a Crear Reporte', async () => {
		await wrapper.find('.btn-ver').trigger('click')
		expect(wrapper.vm.reporteActivo.folio).toBe('ALU-BAC-20260915-001-ABC123')
		await wrapper.find('.fix-right').trigger('click')
		expect(pushMock).toHaveBeenCalledWith('/reporte')
	})

	it('rechaza un reporte mediante el modal de motivo y notas', async () => {
		await wrapper.find('.btn-ver').trigger('click')
		await wrapper.find('.modal-card .btn-peligroso').trigger('click')
		await wrapper.find('#formRechazo select').setValue('7')
		await wrapper.find('#formRechazo textarea').setValue('No procede')
		await wrapper.find('#formRechazo').trigger('submit.prevent')
		await flushPromises()
		expect(db.insert).toHaveBeenCalledWith('historial_reporte', expect.objectContaining({ folio: 'ALU-BAC-20260915-001-ABC123', titulo_id: 7, notas: 'No procede' }))
		expect(db.updateEq).toHaveBeenCalledWith('detalle_reporte', 'folio', 'ALU-BAC-20260915-001-ABC123', { estado_id: 3 })
	})

	it('devuelve un reporte finalizado a Pendiente', async () => {
		wrapper.vm.filtros.estado = 'Finalizado'
		await wrapper.vm.$nextTick()
		await wrapper.find('.btn-devolver').trigger('click')
		await flushPromises()
		expect(db.selectEqSingle).toHaveBeenCalledWith('estadoreporte', 'estado', 'Pendiente', ['id'])
		expect(db.updateEq).toHaveBeenCalledWith('detalle_reporte', 'folio', 'ALU-DRE-20260913-003-QWE456', { estado_id: 1 })
	})

	it('cierra sesión y redirige al inicio', async () => {
		await wrapper.vm.cerrarSesion()
		expect(localStorage.getItem('adminSession')).toBeNull()
		expect(pushMock).toHaveBeenCalledWith('/')
	})

})