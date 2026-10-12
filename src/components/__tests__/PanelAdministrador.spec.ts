import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PanelAdministrador from '@/views/PanelAdministrador.vue'
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

vi.mock('sweetalert2', () => {
	const fire = vi.fn().mockResolvedValue({ isConfirmed: true })
	return {
		default: {
			fire,
			mixin: vi.fn().mockReturnValue({ fire: vi.fn().mockResolvedValue(undefined) }),
		},
	}
})

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
		detalle_reporte: { estado_id: 1, estadoreporte: { estado: 'Pendiente' } },
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
		detalle_reporte: { estado_id: 1, estadoreporte: { estado: 'Pendiente' } },
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
		detalle_reporte: { estado_id: 4, estadoreporte: { estado: 'Finalizado' } },
	},
]

describe('Pruebas del panel de filtros del administrador', () => {
	let wrapper: VueWrapper<any>
	let reportesEstado: any[]

	beforeEach(async () => {
		vi.clearAllMocks()
		reportesEstado = structuredClone(reportesMock)

		const storage = new Map<string, string>([
			[
				'adminSession',
				JSON.stringify({ id: 1, nombre: 'Administrador', departamento_id: 1, tipo_id: 2 }),
			],
		])

		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
		})

		// selectEq(tabla, campo, valor, columnas)
		vi.mocked(db.selectEq).mockImplementation(async (tabla: string) => {
			if (tabla === 'problemas') {
				return {
					data: [
						{ id: 1, nombre: 'Bache', departamento_id: 1 },
						{ id: 2, nombre: 'Falla de iluminacion', departamento_id: 1 },
					],
					error: null,
				}
			}
			if (tabla === 'departamentos') {
				return { data: [{ id: 1, nombre: 'Servicios Publicos' }], error: null }
			}
			return { data: [], error: null }
		})

		// selectEqOrder(tabla, campo, valor, orderBy, columnas, ascending)
		vi.mocked(db.selectEqOrder).mockImplementation(async () => ({
			data: structuredClone(reportesEstado),
			error: null,
		}))

		// selectEqSingle(tabla, campo, valor, columnas) -> id del estado por nombre
		vi.mocked(db.selectEqSingle).mockImplementation(async (_tabla: string, _campo: string, valorEstado: any) => {
			const mapaEstados: Record<string, number> = {
				'Pendiente': 1,
				'En Revisión': 2,
				'Rechazado': 3,
				'Finalizado': 4,
				'Turnado': 5,
				'Devuelto': 6,
			}
			return { data: { id: mapaEstados[valorEstado] ?? null }, error: null }
		})

		// updateEq(tabla, campo, valor, data)
		vi.mocked(db.updateEq).mockImplementation(async (_tabla: string, columna: string, valor: any, payload: any) => {
			const reporte = reportesEstado.find((r: any) => r[columna] === valor)
			if (reporte && 'estado_id' in payload) {
				const estadoTexto =
					payload.estado_id === 3 ? 'Rechazado' :
						payload.estado_id === 1 ? 'Pendiente' :
							payload.estado_id === 2 ? 'En Revisión' :
								payload.estado_id === 4 ? 'Finalizado' :
									payload.estado_id === 5 ? 'Turnado' :
										'Devuelto'
				reporte.detalle_reporte = {
					estado_id: payload.estado_id,
					estadoreporte: { estado: estadoTexto },
				}
			}
			return { data: null, error: null }
		})

		wrapper = mount(PanelAdministrador)
		await vi.waitFor(() => expect(wrapper.vm.cargando).toBe(false))

		// La vista arranca con el filtro de estado en "Pendiente"; se limpia para ver todos los reportes
		wrapper.vm.filtros.estado = ''
		await wrapper.vm.$nextTick()
	})

	afterEach(() => {
		wrapper?.unmount()
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
		expect(db.selectEq).toHaveBeenCalledWith('problemas', 'departamento_id', 1, ['id', 'nombre', 'departamento_id'])
		expect(db.selectEq).toHaveBeenCalledWith('departamentos', 'id', 1, ['id', 'nombre'])
		expect(db.selectEqOrder).toHaveBeenCalledWith(
			'reportes',
			'departamento_id',
			1,
			'created_at',
			expect.any(Array),
			false,
		)

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

		expect(db.updateEq).toHaveBeenCalledWith('detalle_reporte', 'folio', 'ALU-BAC-20260915-001-ABC123', { estado_id: 3 })

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

		expect(db.updateEq).not.toHaveBeenCalled()

		const reporte = wrapper.vm.reportes.find(
			(r: any) => r.folio === 'ALU-BAC-20260915-001-ABC123',
		)
		expect(reporte.estado).toBe('Pendiente')
	})

	it('PU-PA-13: si la BD falla al rechazar, el estado local no cambia', async () => {
		vi.mocked(db.updateEq).mockResolvedValueOnce({ data: null, error: { message: 'fallo' } })

		await wrapper.vm.rechazarReporte('ALU-BAC-20260915-001-ABC123')

		const reporte = wrapper.vm.reportes.find(
			(r: any) => r.folio === 'ALU-BAC-20260915-001-ABC123',
		)
		expect(reporte.estado).toBe('Pendiente')
	})

	it('PU-PA-14: devolver un reporte cambia su estado al indicado', async () => {
		await wrapper.vm.devolverReporte('ALU-DRE-20260913-003-QWE456', 'En Revisión')

		expect(db.updateEq).toHaveBeenCalledWith('detalle_reporte', 'folio', 'ALU-DRE-20260913-003-QWE456', { estado_id: 2 })

		const reporte = wrapper.vm.reportes.find(
			(r: any) => r.folio === 'ALU-DRE-20260913-003-QWE456',
		)
		expect(reporte.estado).toBe('En Revisión')
	})
	it('PU-PA-15: doble clic en rechazar dispara dos actualizaciones a la BD', async () => {
		const Swal = (await import('sweetalert2')).default

		const p1 = wrapper.vm.rechazarReporte('ALU-BAC-20260915-001-ABC123')
		const p2 = wrapper.vm.rechazarReporte('ALU-BAC-20260915-001-ABC123')

		await Promise.all([p1, p2])
		expect(Swal.fire).toHaveBeenCalledTimes(2)
		expect(Swal.fire).toHaveBeenCalledWith(
			expect.objectContaining({ title: '¿Rechazar reporte?' }),)
		expect(db.updateEq).toHaveBeenCalledTimes(1)
	})
	it('PU-PA-16: doble clic en devolver a "Pendiente" también dispara dos actualizaciones', async () => {
		const Swal = (await import('sweetalert2')).default

		const p1 = wrapper.vm.devolverReporte('ALU-BAC-20260915-001-ABC123', 'Pendiente')
		const p2 = wrapper.vm.devolverReporte('ALU-BAC-20260915-001-ABC123', 'Pendiente')

		await Promise.all([p1, p2])

		expect(Swal.fire).toHaveBeenCalledTimes(2)
		expect(Swal.fire).toHaveBeenCalledWith(
			expect.objectContaining({ title: '¿Devolver a "Pendiente"?' }),)
		expect(db.updateEq).toHaveBeenCalledTimes(1)
	})
	it('PU-PA-17: por defecto el filtro de estado arranca en Pendiente', async () => {
		const w = mount(PanelAdministrador)
		await vi.waitFor(() => expect(w.vm.cargando).toBe(false))

		expect(w.vm.filtros.estado).toBe('Pendiente')
		w.unmount()
	})

	it('PU-PA-18: busca por domicilio', async () => {
		wrapper.vm.filtros.busqueda = 'rosales'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('QWE456')
	})

	it('PU-PA-19: combina problema y estado', async () => {
		wrapper.vm.filtros.problema = '1'
		wrapper.vm.filtros.estado = 'Finalizado'
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('tbody tr.fila-datos')).toHaveLength(0)

		wrapper.vm.filtros.estado = 'Pendiente'
		await wrapper.vm.$nextTick()
		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('ABC123')
	})

	it('PU-PA-20: el botón Crear Reporte lleva a la pantalla de reporte', async () => {
		await wrapper.find('.btn-large').trigger('click')

		expect(pushMock).toHaveBeenCalledWith('/reporte')
	})

	it('PU-PA-21: Ver detalle abre el modal con el reporte seleccionado', async () => {
		await wrapper.find('.btn-ver').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.modalVisible).toBe(true)
		expect(wrapper.vm.reporteActivo.folio).toBe('ALU-BAC-20260915-001-ABC123')
		expect(wrapper.text()).toContain('Detalle del Reporte')
	})

	it('PU-PA-22: cerrarModalVer oculta el modal', async () => {
		wrapper.vm.abrirModalVer(wrapper.vm.reportes[0])
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.modalVisible).toBe(true)

		wrapper.vm.cerrarModalVer()
		expect(wrapper.vm.modalVisible).toBe(false)
	})

	it('PU-PA-23: un reporte Pendiente muestra Asignar y Rechazar, pero no Devolver', async () => {
		wrapper.vm.reportes[0].estado = 'Pendiente'
		await wrapper.vm.$nextTick()

		const fila = wrapper.findAll('tbody tr.fila-datos')[0]
		expect(fila.find('.btn-asignar').exists()).toBe(true)
		expect(fila.find('.btn-rechazar').exists()).toBe(true)
		expect(fila.find('.btn-devolver').exists()).toBe(false)
	})

	it('PU-PA-24: un reporte Devuelto muestra Turnar, Devolver y Rechazar', async () => {
		wrapper.vm.reportes[1].estado = 'Devuelto'
		await wrapper.vm.$nextTick()

		const fila = wrapper.findAll('tbody tr.fila-datos')[1]
		expect(fila.find('.btn-asignar').attributes('title')).toBe('Turnar reporte')
		expect(fila.find('.btn-devolver').exists()).toBe(true)
		expect(fila.find('.btn-rechazar').exists()).toBe(true)
	})

	it('PU-PA-25: un reporte Finalizado solo permite Devolver a Pendiente', async () => {
		const fila = wrapper.findAll('tbody tr.fila-datos')[2]

		expect(fila.find('.btn-devolver').exists()).toBe(true)
		expect(fila.find('.btn-rechazar').exists()).toBe(false)
		expect(fila.find('.btn-asignar').exists()).toBe(false)
	})

	it('PU-PA-26: devolver a Pendiente desde el botón de la tabla actualiza la BD', async () => {
		const fila = wrapper.findAll('tbody tr.fila-datos')[2]
		await fila.find('.btn-devolver').trigger('click')

		await vi.waitFor(() => {
			expect(db.updateEq).toHaveBeenCalledWith('detalle_reporte', 'folio', 'ALU-DRE-20260913-003-QWE456', { estado_id: 1 })
		})
	})

	it('PU-PA-27: si el estado no existe en la BD, no actualiza y avisa del error', async () => {
		const Swal = (await import('sweetalert2')).default
		vi.mocked(db.selectEqSingle).mockResolvedValueOnce({ data: null, error: null })

		await wrapper.vm.devolverReporte('ALU-DRE-20260913-003-QWE456', 'En Proceso')

		expect(db.updateEq).not.toHaveBeenCalled()
		expect(Swal.fire).toHaveBeenCalledWith(
			expect.objectContaining({ text: 'No se encontró el estado en la base de datos.' }),
		)
	})

	it('PU-PA-28: si la BD falla al devolver, avisa del error y el estado no cambia', async () => {
		const Swal = (await import('sweetalert2')).default
		vi.mocked(db.updateEq).mockResolvedValueOnce({ data: null, error: { message: 'fallo' } })

		await wrapper.vm.devolverReporte('ALU-DRE-20260913-003-QWE456', 'Pendiente')

		expect(Swal.fire).toHaveBeenCalledWith(
			expect.objectContaining({
				icon: 'error',
				text: 'Hubo un error al actualizar el estado en la base de datos.',
			}),
		)
		const reporte = wrapper.vm.reportes.find((r: any) => r.folio === 'ALU-DRE-20260913-003-QWE456')
		expect(reporte.estado).toBe('Finalizado')
	})

	it('PU-PA-29: al rechazar muestra el mensaje de éxito', async () => {
		const Swal = (await import('sweetalert2')).default

		await wrapper.vm.rechazarReporte('ALU-BAC-20260915-001-ABC123')

		expect(Swal.fire).toHaveBeenCalledWith(
			expect.objectContaining({ title: '¡Rechazado!', icon: 'success' }),
		)
	})
	
	it('PU-PA-30: cancelar el diálogo de devolver no consulta ni modifica la BD', async () => {
		const Swal = (await import('sweetalert2')).default
		vi.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: false } as never)

		await wrapper.vm.devolverReporte('ALU-DRE-20260913-003-QWE456')

		expect(db.selectEqSingle).not.toHaveBeenCalled()
		expect(db.updateEq).not.toHaveBeenCalled()
	})

	it('PU-PA-31: tras rechazar vuelve a cargar los reportes desde la BD', async () => {
		await wrapper.vm.rechazarReporte('ALU-BAC-20260915-001-ABC123')

		// 1 carga inicial + 1 recarga después de actualizar
		expect(db.selectEqOrder).toHaveBeenCalledTimes(2)
	})
})