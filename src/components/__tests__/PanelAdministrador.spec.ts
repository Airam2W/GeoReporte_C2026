import { mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PanelAdministrador from '@/views/PanelAdministrador.vue'
import { supabase } from '@/lib/supabase'
import './setup'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) },
}))

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
		detalle_reporte: { estado_id: 1, estadoreporte: {estado: 'Llegado' }},
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
		detalle_reporte: { estado_id: 1, estadoreporte: {estado: 'Llegado' }},
	},
	{
		folio: 'ALU-DRE-20260913-003-QWE456',
		descripcion: 'Drenaje tapado',
		nombre: 'Luis',
		telefono: '6675550000',
		domicilio: 'Calle Rosales 12',
		referencias: '',
		foto_url: null,
		created_at: '2026-09-13T12:00:00Z',
		problemas: { id: 3, nombre: 'Drenaje' },
		detalle_reporte: { estado_id: 4, estadoreporte: {estado: 'Finalizado' }},
	},
]

describe('Pruebas del panel de filtros del administrador', () => {
	let wrapper: VueWrapper<any>
	let updateEqMock: any
	let updateMock: any
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

		updateEqMock = vi.fn().mockResolvedValue({ error: null })
		updateMock = vi.fn().mockReturnValue({ eq: updateEqMock })

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
			if(table == 'detalle_reporte'){
				return{
					update: updateMock,
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
	it('PU-PA-04: filtrar por estado y oculta los de otros estados', async () => {
		wrapper.vm.filtros.estado = 'Finalizado'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')

		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('QWE456')
	})

	it('PU-PA-05: Mensaje informativo cuando ningún reporte coincide', async () => {
		wrapper.vm.filtros.busqueda = 'FOLIO-INEXISTENTE'
		await wrapper.vm.$nextTick()

		expect(wrapper.findAll('tbody tr.fila-datos')).toHaveLength(0)
		expect(wrapper.find('tbody tr.fila-vacia').text()).toContain(
			'No se encontraron reportes con estos filtros.',
		)
	})

	it('PU-PA-06: busca por nombre del ciudadano y por teléfono', async () => {
		wrapper.vm.filtros.busqueda = 'maria'
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('tbody tr.fila-datos')).toHaveLength(1)
		expect(wrapper.findAll('tbody tr.fila-datos')[0].text()).toContain('Maria')

		wrapper.vm.filtros.busqueda = '6671234567'
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('tbody tr.fila-datos')).toHaveLength(1)
		expect(wrapper.findAll('tbody tr.fila-datos')[0].text()).toContain('Angel')
	})

	it('PU-PA-07: combina filtros y descarta lo que no cumple ambos', async () => {
		wrapper.vm.filtros.busqueda = 'Angel'
		wrapper.vm.filtros.fecha = '2026-09-14'
		await wrapper.vm.$nextTick()

		expect(wrapper.findAll('tbody tr.fila-datos')).toHaveLength(0)
	})

	it('PU-PA-08: carga los catálogos filtrando por el departamento del admin', async () => {
		expect(supabase.from).toHaveBeenCalledWith('problemas')
		expect(supabase.from).toHaveBeenCalledWith('departamentos')
		expect(supabase.from).toHaveBeenCalledWith('reportes')

		const opciones = wrapper.findAll('select option')
		expect(opciones.some((o) => o.text().includes('Bache'))).toBe(true)
		expect(wrapper.find('.content-header p').text()).toBe('Servicios Publicos')
	})

	it('PU-PA-09: redirige al inicio si no hay sesión de administrador', async () => {
		vi.stubGlobal('localStorage', {
			getItem: () => null,
			setItem: vi.fn(),
			removeItem: vi.fn(),
		})

		const w = mount(PanelAdministrador)
		await w.vm.$nextTick()

		expect(pushMock).toHaveBeenCalledWith('/')
		w.unmount()
	})

	it('PU-PA-10: cerrarSesion limpia la sesión y vuelve al inicio', async () => {
		await wrapper.vm.cerrarSesion()

		expect(localStorage.getItem('adminSession')).toBeNull()
		expect(pushMock).toHaveBeenCalledWith('/')
	})	
	it('PU-PA-11: rechazar un reporte actualiza la BD y el estado local', async () => {
		const Swal = (await import('sweetalert2')).default

		await wrapper.vm.rechazarReporte('ALU-BAC-20260915-001-ABC123')

		expect(updateMock).toHaveBeenCalledWith({ estado_id: 3 })
		expect(updateEqMock).toHaveBeenCalledWith('folio', 'ALU-BAC-20260915-001-ABC123')

		const reporte = wrapper.vm.reportes.find(
			(rep: any) => rep.folio === 'ALU-BAC-20260915-001-ABC123',
		)
		expect(reporte.estado).toBe('Rechazado')
		expect(Swal.fire).toHaveBeenCalled()
	})

	it('PU-PA-12: cancelar el diálogo no modifica nada', async () => {
		const Swal = (await import('sweetalert2')).default
		vi.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: false } as never)

		await wrapper.vm.rechazarReporte('ALU-BAC-20260915-001-ABC123')

		expect(updateMock).not.toHaveBeenCalled()

		const reporte = wrapper.vm.reportes.find(
			(r: any) => r.folio === 'ALU-BAC-20260915-001-ABC123',
		)
		expect(reporte.estado).toBe('Llegado')
	})

	it('PU-PA-13: si la BD falla al rechazar, el estado local no cambia', async () => {
		updateEqMock.mockResolvedValueOnce({ error: { message: 'fallo' } })

		await wrapper.vm.rechazarReporte('ALU-BAC-20260915-001-ABC123')

		const reporte = wrapper.vm.reportes.find(
			(r: any) => r.folio === 'ALU-BAC-20260915-001-ABC123',
		)
		expect(reporte.estado).toBe('Llegado')
	})

	it('PU-PA-14: devolver un reporte cambia su estado al indicado', async () => {
		await wrapper.vm.devolverReporte('ALU-DRE-20260913-003-QWE456', 'En Proceso')

		expect(updateMock).toHaveBeenCalledWith({ estado: 'En Proceso' })

		const reporte = wrapper.vm.reportes.find(
			(r: any) => r.folio === 'ALU-DRE-20260913-003-QWE456',
		)
		expect(reporte.estado).toBe('En Proceso')
	})
	it('PU-PA-15: doble clic en rechazar dispara dos actualizaciones a la BD', async () => {
  		const Swal = (await import('sweetalert2')).default

  		const p1 = wrapper.vm.rechazarReporte('ALU-BAC-20260915-001-ABC123')
  		const p2 = wrapper.vm.rechazarReporte('ALU-BAC-20260915-001-ABC123')

  		await Promise.all([p1, p2])
		expect(Swal.fire).toHaveBeenCalledTimes(2)
		expect(Swal.fire).toHaveBeenCalledWith(
    	expect.objectContaining({ title: '¿Rechazar reporte?' }),)
  		expect(updateMock).toHaveBeenCalledTimes(1)
	})
	it('PU-PA-16: doble clic en devolver a "Llegado" también dispara dos actualizaciones', async () => {
		const Swal = (await import('sweetalert2')).default

		const p1 = wrapper.vm.devolverReporte('ALU-BAC-20260915-001-ABC123', 'Llegado')
		const p2 = wrapper.vm.devolverReporte('ALU-BAC-20260915-001-ABC123', 'Llegado')

		await Promise.all([p1, p2])

		expect(Swal.fire).toHaveBeenCalledTimes(2)
		expect(Swal.fire).toHaveBeenCalledWith(
		expect.objectContaining({ title: '¿Devolver a "Llegado"?' }),)
		expect(updateMock).toHaveBeenCalledTimes(1)
	})
})
