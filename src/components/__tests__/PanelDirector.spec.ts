import { mount, VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PanelDirector from '@/views/PanelDirector.vue'
import { supabase } from '@/lib/supabase'
import './setup'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: pushMock }),
}))

vi.mock('sweetalert2', () => ({
	default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) },
}))

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
	let updateEqMock: ReturnType<typeof vi.fn>
	let updateMock: ReturnType<typeof vi.fn>
	let rpcMock: ReturnType<typeof vi.fn>

	beforeEach(async () => {
		vi.clearAllMocks()

		const storage = new Map<string, string>([
			['adminSession', JSON.stringify({ id: 1, nombre: 'Director General', tipo_id: 1 })],
		])

		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
		})

		updateEqMock = vi.fn().mockResolvedValue({ error: null })
		updateMock = vi.fn().mockReturnValue({ eq: updateEqMock })
		rpcMock = vi.mocked(supabase.rpc)
		rpcMock.mockResolvedValue({ data: null, error: null } as never)

		;(supabase.from as any).mockImplementation((table: string) => {
			if (table === 'tipousuario') {
				return {
					select: vi.fn().mockReturnValue({
						neq: vi.fn().mockResolvedValue({
							data: [
								{ id: 2, nombre: 'Supervisor' },
								{ id: 3, nombre: 'Director de Departamento' },
							],
							error: null,
						}),
					}),
				}
			}

			if (table === 'departamentos') {
				return {
					select: vi.fn().mockResolvedValue({
						data: [
							{ id: 1, nombre: 'Servicios Publicos', nombreamigable: 'Servicios Publicos' },
							{ id: 2, nombre: 'Obras Publicas', nombreamigable: 'Obras Publicas' },
						],
						error: null,
					}),
				}
			}

			if (table === 'usuarios') {
				return {
					select: vi.fn().mockReturnValue({
						neq: vi.fn().mockReturnValue({
							order: vi.fn().mockResolvedValue({ data: structuredClone(usuariosMock), error: null }),
						}),
					}),
					update: updateMock,
				}
			}

			return {}
		})

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

		expect(updateMock).toHaveBeenCalledWith({ estadoadministrativo: 'Baja' })
		expect(updateEqMock).toHaveBeenCalledWith('id', 10)
		expect(wrapper.vm.usuarios.find((usuario: any) => usuario.id === 10).estadoadministrativo).toBe('Baja')
	})

	it('PU-PD-06: edita nombre, tipo de usuario y departamento y guarda los cambios en la base de datos', async () => {
		await wrapper.find('.btn-editar').trigger('click')
		await wrapper.vm.$nextTick()

		const modal = wrapper.find('.modal-overlay')
		await modal.find('input[name="nombre"]').setValue('Ana Maria')
		await modal.find('select[name="rol"]').setValue('3')
		await modal.find('select[name="departamento"]').setValue('2')
		await modal.find('form').trigger('submit.prevent')

		expect(rpcMock).toHaveBeenCalledWith('guardar_usuario', {
			p_id: 10,
			p_nombre: 'Ana Maria',
			p_apellido_p: 'Garcia',
			p_apellido_m: 'Lopez',
			p_correo: 'ana.garcia@culiacan.gob.mx',
			p_contrasena: null,
			p_tipousuario_id: 3,
			p_departamento_id: 2,
		})
	})
})
