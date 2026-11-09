import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Swal from 'sweetalert2'
import PanelDirector from '@/views/PanelDirector.vue'
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

vi.mock('sweetalert2', () => {
	const fire = vi.fn().mockResolvedValue({ isConfirmed: true })
	return {
		default: {
			fire,
			mixin: vi.fn().mockReturnValue({ fire: vi.fn().mockResolvedValue(undefined) }),
		},
	}
})

// Evita cargar el router real y el indicador de carga global
vi.mock('@/logic/redirectUser', () => ({ redireccionarUsuario: vi.fn() }))
vi.mock('@/composable/useCargando', () => ({
	useCargando: () => ({ mostrarCargando: vi.fn(), ocultarCargando: vi.fn() }),
}))

// JWT falso: solo importa el payload (segunda parte)
const crearToken = (payload: object) => `cabecera.${btoa(JSON.stringify(payload))}.firma`

// Roles reales: 2 = Administrador, 3 = Supervisor, 4 = Jefe, 5 = Trabajador, 6 = Personal externo
const usuariosMock = [
	{
		id: 10,
		correo: 'ana.garcia@culiacan.gob.mx',
		nombre: 'Ana',
		apellido_p: 'Garcia',
		apellido_m: 'Lopez',
		estadoadministrativo: 'Alta',
		tipousuario_id: 2,
		tipousuario: { nombre: 'Administrador' },
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
		tipousuario: { nombre: 'Supervisor' },
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
		tipousuario: { nombre: 'Administrador' },
		administradores: [{ created_at: '2026-09-13T12:00:00Z', departamentos: { id: 2, nombre: 'Obras Publicas' } }],
		supervisores: [],
	},
]

const departamentosInternosMock = [
	{ id: 1, nombre: 'Servicios Publicos', nombreamigable: 'Servicios Publicos', estado: 'Alta' },
	{ id: 2, nombre: 'Obras Publicas', nombreamigable: 'Obras Publicas', estado: 'Alta' },
]

const departamentosExternosMock = [{ id: 1, departamento: 'Proveedor Externo', estado: 'Alta' }]

const problemasInternosMock = [
	{
		id: 1, nombre: 'Bache', nombreamigable: 'Bache en vialidad', departamento_id: 1,
		departamentos: { id: 1, nombre: 'Servicios Publicos' }, estado: 'Alta',
	},
]

const problemasExternosMock = [
	{
		id: 5, nombre: 'Fuga', nombreamigable: 'Fuga de agua', departamento_externo_id: 1,
		departamentos_externos: { id: 1, departamento: 'Proveedor Externo' }, estado: 'Alta',
	},
]

const crearStorage = (inicial: Record<string, string>) => {
	const storage = new Map<string, string>(Object.entries(inicial))
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => storage.set(key, value),
		removeItem: (key: string) => storage.delete(key),
	})
	return storage
}

describe('Pruebas del panel del director general', () => {
	let wrapper: VueWrapper<any>
	let usuariosState: any[]

	beforeEach(async () => {
		vi.clearAllMocks()
		usuariosState = structuredClone(usuariosMock)

		// La sesión vive en el token "userToken" y el panel exige tipo_id === 1
		crearStorage({ userToken: crearToken({ id: 1, nombre: 'Director General', tipo_id: 1 }) })

		vi.mocked(db.esperarUsuario).mockResolvedValue('token-de-prueba')

		// Roles (se excluye al director general)
		vi.mocked(db.obtenerUsuarioExcepto).mockResolvedValue({
			data: [
				{ id: 2, nombre: 'Administrador' },
				{ id: 3, nombre: 'Supervisor' },
			],
			error: null,
		})

		// Catálogos y listas
		vi.mocked(db.obtenerTodosDepartamentosInternos).mockImplementation(async () => ({
			data: structuredClone(departamentosInternosMock),
			error: null,
		}))
		vi.mocked(db.obtenerTodosDepartamentosExternos).mockImplementation(async () => ({
			data: structuredClone(departamentosExternosMock),
			error: null,
		}))
		vi.mocked(db.obtenerTodosSupervisores).mockResolvedValue({ data: [], error: null })
		vi.mocked(db.obtenerTodosJefes).mockResolvedValue({ data: [], error: null })
		vi.mocked(db.obtenerTodosUsuariosExcepto).mockImplementation(async () => ({
			data: structuredClone(usuariosState),
			error: null,
		}))
		vi.mocked(db.obtenerTodosProblemasInternos).mockImplementation(async () => ({
			data: structuredClone(problemasInternosMock),
			error: null,
		}))
		vi.mocked(db.obtenerTodosProblemasExternos).mockImplementation(async () => ({
			data: structuredClone(problemasExternosMock),
			error: null,
		}))

		// Validaciones de duplicados de los formularios (sin duplicados => error: null)
		const sinError = { data: [], error: null }
		vi.mocked(db.obtenerDepartamentosinternosPorNombre).mockResolvedValue(sinError)
		vi.mocked(db.obtenerDepartamentosExternosPorNombre).mockResolvedValue(sinError)
		vi.mocked(db.obtenerProblematicasInternasPorNombre).mockResolvedValue(sinError)
		vi.mocked(db.obtenerProblematicasExternasPorNombre).mockResolvedValue(sinError)
		vi.mocked(db.obtenerCorreoUnico).mockResolvedValue({ data: null, error: null })

		// actualizarEstadoUsuario(id, data) actualiza también el estado simulado
		vi.mocked(db.actualizarEstadoUsuario).mockImplementation(async (id: any, payload: any) => {
			const item = usuariosState.find((u: any) => u.id === id)
			if (item) Object.assign(item, payload)
			return { data: null, error: null }
		})
		vi.mocked(db.actualizarFechaBajaUsuario).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.actualizarFechaAltaUsuario).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.actualizarEstadoDepartamentoInterno).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.actualizarEstadoDepartamentoExterno).mockResolvedValue({ data: null, error: null })

		vi.mocked(db.eliminarDepartamentoInterno).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.eliminarDepartamentoExterno).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.crearDepartamentoInterno).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.crearDepartamentoExterno).mockResolvedValue({ data: null, error: null })
		vi.mocked(db.guardarUsuario).mockResolvedValue({ data: { ok: true }, error: null })

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
		expect(filas[0].text()).toContain('Supervisor')
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
			expect(db.actualizarEstadoUsuario).toHaveBeenCalledWith(10, { estadoadministrativo: 'Baja' })
		})
		await vi.waitFor(() => {
			expect(db.actualizarFechaBajaUsuario).toHaveBeenCalledWith(10, { fechabaja: expect.any(String) })
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

		// El formulario valida el correo con obtenerCorreoUnico(correo, id) antes de emitir "save"
		await vi.waitFor(() => {
			expect(db.obtenerCorreoUnico).toHaveBeenCalledWith('ana.garcia@culiacan.gob.mx', 10)
		})
		await vi.waitFor(() => {
			expect(db.guardarUsuario).toHaveBeenCalledWith({
				p_id: 10,
				p_nombre: 'Ana Maria',
				p_apellido_p: 'Garcia',
				p_apellido_m: 'Lopez',
				p_correo: 'ana.garcia@culiacan.gob.mx',
				p_contrasena: null,
				p_tipousuario_id: 3,
				p_departamento_id: 2,
				p_estado: 'Alta',
			})
		})
	})

	it('PU-PD-07: redirige al inicio si no hay sesión', async () => {
		crearStorage({})

		const w = mount(PanelDirector)
		await w.vm.$nextTick()

		expect(pushMock).toHaveBeenCalledWith('/')
		w.unmount()
	})

	it('PU-PD-08: cerrarSesion elimina el token y redirige al inicio', async () => {
		await wrapper.vm.cerrarSesion()

		expect(localStorage.getItem('userToken')).toBeNull()
		expect(pushMock).toHaveBeenCalledWith('/')
	})

	it('PU-PD-09: cambiar a la pestaña Departamentos carga y muestra los datos', async () => {
		const tabDepartamentos = wrapper.findAll('.tab-seccion').find((t) => t.text().includes('Departamentos'))
		await tabDepartamentos!.trigger('click')
		await flushPromises()

		expect(wrapper.vm.filtros.seccion).toBe('departamentos')
		expect(wrapper.find('h2').text()).toContain('Gestión de Departamentos')
	})

	it('PU-PD-10: cambiar de sección resetea los filtros', async () => {
		wrapper.vm.filtros.rol = '3'
		wrapper.vm.filtros.busqueda = 'algo'

		const tabProblematicas = wrapper.findAll('.tab-seccion').find((t) => t.text().includes('Problemáticas'))
		await tabProblematicas!.trigger('click')
		await flushPromises()

		expect(wrapper.vm.filtros.busqueda).toBe('')
		expect(wrapper.vm.filtros.rol).toBe('')
	})

	it('PU-PD-11: crea un departamento interno nuevo', async () => {
		wrapper.vm.filtros.seccion = 'departamentos'
		await wrapper.vm.$nextTick()
		await flushPromises()

		await wrapper.find('.btn-primario').trigger('click') // "Agregar Departamento"
		await wrapper.vm.$nextTick()

		const modal = wrapper.find('.modal-overlay')
		await modal.find('input[name="nombre"]').setValue('Nuevo Depto')
		await modal.find('select[name="tipo"]').setValue('Interno')
		await wrapper.vm.$nextTick()
		await modal.find('input[name="nombreamigable"]').setValue('Depto Amigable')
		await modal.find('form').trigger('submit.prevent')

		await vi.waitFor(() => {
			expect(db.crearDepartamentoInterno).toHaveBeenCalledWith({
				nombre: 'Nuevo Depto',
				nombreamigable: 'Depto Amigable',
				estado: 'Alta',
			})
		})
	})

	it('PU-PD-12: elimina un departamento interno desde la tabla', async () => {
		wrapper.vm.filtros.seccion = 'departamentos'
		await wrapper.vm.$nextTick()
		await flushPromises()

		await wrapper.find('.btn-eliminar').trigger('click')

		await vi.waitFor(() => {
			expect(db.eliminarDepartamentoInterno).toHaveBeenCalledWith(1)
		})
	})

	it('PU-PD-13: filtra problemáticas por tipo', async () => {
		wrapper.vm.filtros.seccion = 'problematicas'
		await wrapper.vm.$nextTick()
		await flushPromises()

		// Sin filtro de tipo se ven las internas y las externas
		expect(wrapper.findAll('tbody tr.fila-datos')).toHaveLength(2)

		wrapper.vm.filtros.tipoProblematica = 'Interno'
		await wrapper.vm.$nextTick()

		const filas = wrapper.findAll('tbody tr.fila-datos')
		expect(filas).toHaveLength(1)
		expect(filas[0].text()).toContain('Bache')
		expect(filas[0].text()).toContain('Interno')
	})

	it('PU-PD-14: cambiar tipo de problemática resetea el filtro de departamento', async () => {
		wrapper.vm.filtros.seccion = 'problematicas'
		await wrapper.vm.$nextTick()

		wrapper.vm.filtros.departamentoProblematica = '1'
		wrapper.vm.filtros.tipoProblematica = 'Externo'
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.filtros.departamentoProblematica).toBe('')
	})

	it('PU-PD-15: si no se puede eliminar un departamento, lo da de baja', async () => {
		vi.mocked(db.eliminarDepartamentoInterno).mockResolvedValueOnce({
			data: null,
			error: { message: 'foreign key violation' },
		})

		wrapper.vm.filtros.seccion = 'departamentos'
		await wrapper.vm.$nextTick()
		await flushPromises()

		await wrapper.find('.btn-eliminar').trigger('click')

		await vi.waitFor(() => {
			expect(db.actualizarEstadoDepartamentoInterno).toHaveBeenCalledWith(1, { estado: 'Baja' })
		})
	})

	it('PU-PD-16: niega el acceso si el token no es de director general', async () => {
		crearStorage({ userToken: crearToken({ id: 2, nombre: 'Administrador', tipo_id: 2 }) })

		const w = mount(PanelDirector)
		await flushPromises()

		expect(Swal.fire).toHaveBeenCalledWith('Acceso Denegado', expect.any(String), 'error')
		expect(redireccionarUsuario).toHaveBeenCalled()
		w.unmount()
	})
})