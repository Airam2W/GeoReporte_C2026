import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import HomeComponent from '@/views/HomeView.vue'
import ReporteDetalleModal from '@/components/ReporteDetalleModal.vue'
import { obtenerReportePorFolio } from '@/services/supabaseController'

const { pushMock, routeMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  routeMock: { query: {} as Record<string, any> },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
  useRoute: () => routeMock,
}))

vi.mock('@/logic/home', async () => {
  const { ref } = await import('vue')
  return {
    menuAbierto: ref(false),
    menuRef: ref(null),
    iniciarSesion: vi.fn(),
  }
})

const crearReporteMock = (detalle_reporte: any, extra: object = {}) => ({
  folio: 'ALU-BAC-20260315-153000-AB3F9',
  descripcion: 'Prueba de consulta de folio',
  nombre: 'Angel',
  telefono: '6671234567',
  domicilio: 'Av. Álvaro Obregón 450',
  referencias: null,
  foto_url: 'https://example.com/foto.jpg',
  created_at: '2026-03-15T00:00:00Z',
  problemas: { nombreamigable: 'Bache' },
  detalle_reporte,
  ...extra,
})

describe('Pruebas Unitarias del Módulo Home', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    vi.clearAllMocks()
    routeMock.query = {}

    vi.stubGlobal('alert', vi.fn())
    vi.spyOn(console, 'log').mockImplementation(() => {})
    wrapper = mount(HomeComponent, {
      global: { stubs: { ReporteDetalleModal: true } },
    })
  })

  afterEach(() => {
    wrapper.unmount()
  })

  it('PU-1: Mostrar la información de un folio existente', async () => {
    const mockReporte = crearReporteMock({
      estado_id: 7,
      estadoreporte: { estado: 'En Proceso' },
    })
    vi.mocked(obtenerReportePorFolio).mockResolvedValueOnce({ data: mockReporte, error: null })

    wrapper.vm.folioInput = mockReporte.folio
    await wrapper.vm.ejecutarBusqueda()

    expect(obtenerReportePorFolio).toHaveBeenCalledWith(mockReporte.folio)
    expect(wrapper.vm.reporteEncontrado).toEqual(
      expect.objectContaining({ folio: mockReporte.folio, estado: 'En Proceso' }),
    )
    expect(wrapper.vm.modalVisible).toBe(true)
    expect(wrapper.vm.modalBusquedaVisible).toBe(false)
  })

  it('PU-2: Mostrar mensaje si el folio no existe', async () => {
    vi.mocked(obtenerReportePorFolio).mockResolvedValueOnce({ data: null, error: null })

    wrapper.vm.folioInput = 'FOLIO-INEXISTENTE'
    await wrapper.vm.ejecutarBusqueda()

    expect(wrapper.vm.errorBusqueda).toBe('No se encontró ningún reporte con ese folio.')
    expect(wrapper.vm.modalVisible).toBe(false)
  })

  it('PU-3: No consultar en la BD si el folio está vacío', async () => {
    wrapper.vm.folioInput = '   '
    await wrapper.vm.ejecutarBusqueda()

    expect(obtenerReportePorFolio).not.toHaveBeenCalled()
    expect(wrapper.vm.errorBusqueda).toBe('Por favor, ingresa el folio de tu reporte.')
  })

  it('PU-4: Si no hay detalle_reporte, usa "Pendiente" por defecto', async () => {
    const mockReporte = crearReporteMock(null)
    vi.mocked(obtenerReportePorFolio).mockResolvedValueOnce({ data: mockReporte, error: null })

    wrapper.vm.folioInput = mockReporte.folio
    await wrapper.vm.ejecutarBusqueda()

    expect(wrapper.vm.reporteEncontrado.estado).toBe('Pendiente')
  })

  it('PU-05: Navegación a la ruta /reporte', () => {
    wrapper.vm.irAReporte()
    expect(pushMock).toHaveBeenCalledWith('/reporte')
  })

  it('PU-06: abrirModalBusqueda limpia el estado anterior y abre el modal', () => {
    wrapper.vm.folioInput = 'ALGO-VIEJO'
    wrapper.vm.errorBusqueda = 'Un error anterior'
    wrapper.vm.modalBusquedaVisible = false

    wrapper.vm.abrirModalBusqueda()

    expect(wrapper.vm.folioInput).toBe('')
    expect(wrapper.vm.errorBusqueda).toBe('')
    expect(wrapper.vm.modalBusquedaVisible).toBe(true)
  })

  it('PU-07: Los eventos del modal de detalle se manejan correctamente', async () => {
    wrapper.vm.modalVisible = true
    await wrapper.vm.$nextTick()

    const modal = wrapper.findComponent(ReporteDetalleModal)
    expect(modal.exists()).toBe(true)

    modal.vm.$emit('close')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.modalVisible).toBe(false)

    modal.vm.$emit('buscar')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.modalBusquedaVisible).toBe(true)
  })

  it('PU-08: Mostrar el mensaje de error que devuelve el servicio (string)', async () => {
    vi.mocked(obtenerReportePorFolio).mockResolvedValueOnce({ data: null, error: 'Error de conexión' })

    wrapper.vm.folioInput = 'ALU-BAC-20260315-153000-AB3F9'
    await wrapper.vm.ejecutarBusqueda()

    expect(wrapper.vm.errorBusqueda).toBe('Error de conexión')
    expect(wrapper.vm.modalVisible).toBe(false)
  })

  it('PU-09: El botón "Iniciar sesión" llama a iniciarSesion', async () => {
    const { iniciarSesion } = await import('@/logic/home')

    await wrapper.find('.btn-outline').trigger('click')

    expect(iniciarSesion).toHaveBeenCalled()
  })

  it('PU-10: Si la URL trae ?folio=, busca el reporte automáticamente al cargar', async () => {
    const mockReporte = crearReporteMock({ estado_id: 1, estadoreporte: { estado: 'Pendiente' } })
    vi.mocked(obtenerReportePorFolio).mockResolvedValueOnce({ data: mockReporte, error: null })
    routeMock.query = { folio: '  ALU-BAC-20260315-153000-AB3F9  ' }

    const w = mount(HomeComponent, {
      global: { stubs: { ReporteDetalleModal: true } },
    })
    await flushPromises()

    expect(obtenerReportePorFolio).toHaveBeenCalledWith('ALU-BAC-20260315-153000-AB3F9')
    expect(w.vm.modalVisible).toBe(true)
    w.unmount()
  })

  it('PU-11: Sin ?folio= en la URL no se hace ninguna búsqueda al cargar', () => {
    expect(obtenerReportePorFolio).not.toHaveBeenCalled()
    expect(wrapper.vm.modalVisible).toBe(false)
  })

  it('PU-12: Las notas de rechazo llegan ordenadas y solo las que tienen notas', async () => {
    const mockReporte = crearReporteMock(
      { estado_id: 3, estadoreporte: { estado: 'Rechazado' } },
      {
        historial_reporte: [
          { categoria_historial_id: 2, fecha: '2026-03-16T10:00:00Z', notas: 'Primera', titulo: { nombre: 'No procedente' } },
          { categoria_historial_id: 2, fecha: '2026-03-17T10:00:00Z', notas: 'Segunda', titulo: { nombre: 'Duplicado' } },
          { categoria_historial_id: 2, fecha: '2026-03-18T10:00:00Z', notas: '', titulo: { nombre: 'Sin notas' } },
          { categoria_historial_id: 4, fecha: '2026-03-19T10:00:00Z', notas: 'Es un avance', titulo: { nombre: 'Avance' } },
        ],
      },
    )
    vi.mocked(obtenerReportePorFolio).mockResolvedValueOnce({ data: mockReporte, error: null })

    wrapper.vm.folioInput = mockReporte.folio
    await wrapper.vm.ejecutarBusqueda()

    const notas = wrapper.vm.reporteEncontrado.notas_rechazo
    expect(notas.map((n: any) => n.notas)).toEqual(['Segunda', 'Primera'])
  })

  it('PU-13: Muestra el mensaje cuando el servicio devuelve el error como objeto', async () => {
    vi.mocked(obtenerReportePorFolio).mockResolvedValueOnce({
      data: null,
      error: { message: 'Error de red' },
    })

    wrapper.vm.folioInput = 'ALU-BAC-20260315-153000-AB3F9'
    await wrapper.vm.ejecutarBusqueda()

    expect(wrapper.vm.errorBusqueda).toBe('Error de red')
  })
})