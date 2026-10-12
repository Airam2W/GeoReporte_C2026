import { mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PanelDirector from '@/views/PanelDirector.vue'
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

const usuariosMock = [
	{
		id: 10,
		correo: 'ana.garcia@culiacan.gob.mx',
		nombre: 'Ana',
		apellido_p: 'Garcia',
		apellido_m: 'Lopez',
		estadoadministrativo: 'Alta',
		tipousuario_id: 2,
		tipousuario: { nombre: 'Supervisor' },
		administradores: [{ created_at: '2026-09-15T12:00:00Z', departamentos: { id: 1, nombre: 'Servicios Publicos' } }],
		supervisores: [],
	},
	{
		id: 11,
		correo: 'bruno.martinez@culiacan.gob.mx',
		nombre: 'Bruno',
		apellido_p: 'Martinez',
		apellido_m: 'Soto',
		estadoadministrativo: 'Baja',
		tipousuario_id: 3,
		tipousuario: { nombre: 'Director de Departamento' },
		administradores: [],
		supervisores: [{ created_at: '2026-09-14T12:00:00Z', departamentos: { id: 2, nombre: 'Obras Publicas' } }],
	},
	{
		id: 12,
		correo: 'carla.rojas@culiacan.gob.mx',
		nombre: 'Carla',
		apellido_p: 'Rojas',
		apellido_m: 'Perez',
		estadoadministrativo: 'Alta',
		tipousuario_id: 2,
		tipousuario: { nombre: 'Supervisor' },
		administradores: [{ created_at: '2026-09-13T12:00:00Z', departamentos: { id: 2, nombre: 'Obras Publicas' } }],
		supervisores: [],
	},
]

describe('Pruebas del panel del director general', () => {
	let wrapper: VueWrapper<any>
	let usuariosState: any[]

	beforeEach(async () => {
		vi.clearAllMocks()
		usuariosState = structuredClone(usuariosMock)

		const storage = new Map<string, string>([
			['adminSession', JSON.stringify({ id: 1, nombre: 'Director General', tipo_id: 1 })],
		])

		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
		})

		// selectNeq(tabla, campo, valor, columnas) -> tipos de usuario
		vi.mocked(db.selectNeq).mockResolvedValue({
			data: [
				{ id: 2, nombre: 'Supervisor' },
				{ id: 3, nombre: 'Director de Departamento' },
			],
			error: null,
		})

		// selectAll(tabla, columnas)
		vi.mocked(db.selectAll).mockImplementation(async (tabla: string) => {
			const datos: Record<string, any[]> = {
				departamentos: [
					{ id: 1, nombre: 'Servicios Publicos', nombreamigable: 'Servicios Publicos', estado: 'Alta' },
					{ id: 2, nombre: 'Obras Publicas', nombreamigable: 'Obras Publicas', estado: 'Alta' },
				],
				departamentos_externos: [{ id: 1, departamento: 'Proveedor Externo', estado: 'Alta' }],
				supervisores: [],
				jefes: [],
			}
			return { data: structuredClone(datos[tabla] ?? []), error: null }
		})

		// selectNeqOrder(tabla, campo, valor, orderBy, columnas, ascending) -> usuarios
		vi.mocked(db.selectNeqOrder).mockImplementation(async () => ({
			data: structuredClone(usuariosState),
			error: null,
		}))

		// selectOrder(tabla, campo, columnas, ascending)
		vi.mocked(db.selectOrder).mockImplementation(async (tabla: string) => {
			const datos: Record<string, any[]> = {
				departamentos: [
					{ id: 1, nombre: 'Servicios Publicos', nombreamigable: 'Servicios Publicos', estado: 'Alta' },
					{ id: 2, nombre: 'Obras Publicas', nombreamigable: 'Obras Publicas', estado: 'Alta' },
				],
				departamentos_externos: [{ id: 1, departamento: 'Proveedor Externo', estado: 'Alta' }],
				problemas: [],
				problemas_externos: [],
			}
			return { data: structuredClone(datos[tabla] ?? []), error: null }
		})

		// selectIlike(tabla, campo, valor, columnas) -> validación de nombre duplicado en los formularios (sin duplicados)
		vi.mocked(db.selectIlike).mockResolvedValue({ data: [], error: null })

		// selectIlikeMaybeSingle(tabla, campo, valor) -> validación de correo duplicado (sin duplicado)
		vi.mocked(db.selectIlikeMaybeSingle).mockResolvedValue({ data: null, error: null })

		// updateEq(tabla, campo, valor, data)
		vi.mocked(db.updateEq).mockImplementation(async (tabla: string, campo: string, valor: any, payload: any) => {
			if (tabla === 'usuarios') {
				const item = usuariosState.find((u: any) => u[campo] === valor)
				if (item) Object.assign(item, payload)
			}
			return { data: null, error: null }
		})

		vi.mocked(db.deleteEq).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.insert).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.callRpc).mockResolvedValue({ data: { ok: true }, error: null })

		wrapper = mount(PanelDirector)
		await vi.waitFor(() => expect(wrapper.vm.cargando).toBe(false))
	})

	afterEach(() => {
		wrapper.unmount()
	})

	it('PU-PD-01: filtra personal por nombre', async () => {
		wrapper.vm.filtros.busqueda = 'ana'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('Ana Garcia Lopez')
	})

	it('PU-PD-02: filtra personal por rol', async () => {
		wrapper.vm.filtros.estado = ''
		wrapper.vm.filtros.rol = '3'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('Director de Departamento')
	})

	it('PU-PD-03: filtra personal por departamento', async () => {
		wrapper.vm.filtros.estado = ''
		wrapper.vm.filtros.departamento = '2'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(2)
		expect(filas.map((fila) => fila.text())).toEqual(
			expect.arrayContaining(['Bruno Martinez Soto', 'Carla Rojas Perez'].map((nombre) => expect.stringContaining(nombre))),
		)
	})

	it('PU-PD-04: filtra personal por estado del empleado', async () => {
		const filas = wrapper.findAll('tbody tr.fila-datos')

		expect(filas).toHaveLength(2)
		expect(filas.map((fila) => fila.text())).toEqual(
			expect.arrayContaining(['Ana Garcia Lopez', 'Carla Rojas Perez'].map((nombre) => expect.stringContaining(nombre))),
		)
	})

	it('PU-PD-05: da de baja a un empleado desde Ver detalles y actualiza la base de datos', async () => {
		await wrapper.find('.btn-ver').trigger('click')
		await wrapper.vm.$nextTick()

		const botonBaja = wrapper.find('.modal-usuario .btn-primario')
		expect(botonBaja.text()).toContain('Dar de Baja')
		await botonBaja.trigger('click')

		await vi.waitFor(() => {
			expect(db.updateEq).toHaveBeenCalledWith('usuarios', 'id', 10, { estadoadministrativo: 'Baja' })
		})
		await vi.waitFor(() => {
			expect(db.updateEq).toHaveBeenCalledWith('usuarios', 'id', 10, { fechabaja: expect.any(String) })
		})
		expect(usuariosState.find((usuario: any) => usuario.id === 10).estadoadministrativo).toBe('Baja')
	})

	it('PU-PD-06: edita nombre, tipo de usuario y departamento y guarda los cambios en la base de datos', async () => {
		await wrapper.find('.btn-editar').trigger('click')
		await wrapper.vm.$nextTick()

		const modal = wrapper.find('.modal-overlay')
		await modal.find('input[name="nombre"]').setValue('Ana Maria')
		await modal.find('select[name="rol"]').setValue('3')
		await modal.find('select[name="departamento"]').setValue('2')
		await modal.find('form').trigger('submit.prevent')

		await vi.waitFor(() => {
			expect(db.callRpc).toHaveBeenCalledWith('guardar_usuario', {
				p_id: 10,
				p_nombre: 'Ana Maria',
				p_apellido_p: 'Garcia',
				p_apellido_m: 'Lopez',
				p_correo: 'ana.garcia@culiacan.gob.mx',
				p_contrasena: null,
				p_tipousuario_id: 3,
				p_departamento_id: 2,
				p_estado: 'Alta'
			})
		})
	})
	it('PU-PD-07: redirige al inicio si no hay sesión', async () => {
		vi.stubGlobal('localStorage', {
			getItem: () => null,
			setItem: vi.fn(),
			removeItem: vi.fn(),
		})

		const w = mount(PanelDirector)
		await w.vm.$nextTick()

		expect(pushMock).toHaveBeenCalledWith('/')
		w.unmount()
	})

	it('PU-PD-08: cerrarSesion limpia la sesión y redirige al inicio', async () => {
		await wrapper.vm.cerrarSesion()

		expect(localStorage.getItem('adminSession')).toBeNull()
		expect(pushMock).toHaveBeenCalledWith('/')
	})
	it('PU-PD-09: cambiar a la pestaña Departamentos carga y muestra los datos', async () => {
		const tabDepartamentos = wrapper.findAll('.tab-seccion').find((t) => t.text().includes('Departamentos'))
		await tabDepartamentos!.trigger('click')
		await vi.waitFor(() => expect(wrapper.vm.cargando).toBe(false))

		expect(wrapper.vm.filtros.seccion).toBe('departamentos')
		expect(wrapper.find('h2').text()).toContain('Gestión de Departamentos')
	})

	it('PU-PD-10: cambiar de sección resetea los filtros', async () => {
		wrapper.vm.filtros.rol = '3'
		wrapper.vm.filtros.busqueda = 'algo'

		const tabProblematicas = wrapper.findAll('.tab-seccion').find((t) => t.text().includes('Problemáticas'))
		await tabProblematicas!.trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.filtros.busqueda).toBe('')
		expect(wrapper.vm.filtros.rol).toBe('')
	})
	it('PU-PD-11: crea un departamento interno nuevo', async () => {
		wrapper.vm.filtros.seccion = 'departamentos'
		await wrapper.vm.$nextTick()

		await wrapper.find('.btn-primario').trigger('click') // "Agregar Departamento"
		await wrapper.vm.$nextTick()

		const modal = wrapper.find('.modal-overlay')
		await modal.find('input[name="nombre"]').setValue('Nuevo Depto')
		await modal.find('select[name="tipo"]').setValue('Interno')
		await wrapper.vm.$nextTick()
		await modal.find('input[name="nombreamigable"]').setValue('Depto Amigable')
		await modal.find('form').trigger('submit.prevent')

		await vi.waitFor(() => {
			expect(db.insert).toHaveBeenCalledWith('departamentos', {
				nombre: 'Nuevo Depto',
				nombreamigable: 'Depto Amigable',
				estado: 'Alta',
			})
		})
	})
	it('PU-PD-12: da de baja un departamento interno desde la tabla', async () => {
		wrapper.vm.filtros.seccion = 'departamentos'
		await wrapper.vm.$nextTick()
		await vi.waitFor(() => expect(wrapper.vm.cargando).toBe(false))
		await wrapper.vm.$nextTick()

		const botonEliminar = wrapper.find('.btn-eliminar')
		await botonEliminar.trigger('click')

		await vi.waitFor(() => {
			expect(db.deleteEq).toHaveBeenCalledWith('departamentos', 'id', 1)
		})
	})
	it('PU-PD-13: filtra problemáticas por tipo', async () => {
		wrapper.vm.filtros.seccion = 'problematicas'
		await wrapper.vm.$nextTick()
		await vi.waitFor(() => expect(wrapper.vm.cargando).toBe(false))

		wrapper.vm.filtros.tipoProblematica = 'Interno'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas.every((f) => f.text().includes('Interno'))).toBe(true)
	})

	it('PU-PD-14: cambiar tipo de problemática resetea el filtro de departamento', async () => {
		wrapper.vm.filtros.seccion = 'problematicas'
		await wrapper.vm.$nextTick()

		wrapper.vm.filtros.departamentoProblematica = '1'
		wrapper.vm.filtros.tipoProblematica = 'Externo'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.filtros.departamentoProblematica).toBe('')
	})
})