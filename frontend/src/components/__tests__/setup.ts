import { beforeEach, vi } from 'vitest'

const { funcionesBackend, respuestaVacia } = vi.hoisted(() => {
  // Respuesta por defecto con la forma { data, error } que usa el backend
  const respuestaVacia = () => Promise.resolve({ data: null, error: null })

  const funcionesBackend = [
    // GET
    'obtenerTodosDepartamentosInternos', 'obtenerTodosDepartamentosExternos',
    'obtenerTodosProblemasInternos', 'obtenerTodosProblemasExternos',
    'obtenerTodosSupervisores', 'obtenerTodosJefes',
    'obtenerUsuarioExcepto', 'obtenerTodosUsuariosExcepto',
    'obtenerDepartamentosinternosPorNombre', 'obtenerDepartamentosExternosPorNombre',
    'obtenerProblematicasInternasPorNombre', 'obtenerProblematicasExternasPorNombre',
    'obtenerCorreoUnico', 'obtenerReportePorFolio', 'obtenerEstadoIDPorNombre',
    'obtenerProblematicasInternasPorID', 'obtenerProblematicasExternasPorID',
    'obtenerDepartamentosExternosPorID', 'obtenerDepartamentosInternosPorID',
    'obtenerAdministradoresInternosPorID', 'obtenerAdministradoresExternosPorID',
    'obtenerSupervisorIDPorUsuarioID', 'obtenerSupervisoresPorDepartamentoID',
    'obtenerJefeIDPorUsuarioID', 'obtenerTitulos', 'obtenerCategoriaHistorial',
    'obtenerDepartamentosOrdenadosPorId', 'obtenerProblemasPorDepartamentoID',
    'obtenerReportesPorDepartamentoExternoID', 'obtenerReportesPorDepartamentoInternoID',
    'obtenerReportesJefe', 'obtenerReportesSupervisor', 'obtenerJefesPorSupervisor',
    'obtenerHistorial', 'obtenerReportesMapa',
    // PUT
    'actualizarEstadoReporte', 'actualizarEstadoReporteConJefeFechaInicio',
    'actualizarEstadoReporteConFechaCierre', 'actualizarEstadoReporteQuitarSupervisor',
    'actualizarEstadoProblemaInterno', 'actualizarEstadoProblemaExterno',
    'actualizarSupervisorEstadoReporte', 'actualizarProblemaInterno',
    'actualizarProblemaExterno', 'actualizarDepartamentoInterno',
    'actualizarDepartamentoExterno', 'actualizarEstadoDepartamentoInterno',
    'actualizarEstadoDepartamentoExterno', 'actualizarEstadoUsuario',
    'actualizarFechaBajaUsuario', 'actualizarFechaAltaUsuario',
    'actualizarFotoDepartamentoReporte', 'actualizarReporteADepartamentoInterno',
    'actualizarReporteADepartamentoExterno', 'actualizarPrioridadReporte',
    // POST
    'obtenerUsuarioPorCorreoYContrasena', 'guardarUsuario', 'crearReporte',
    'crearDetalleReporte', 'crearHistorialReporte', 'crearHistorialReporteConFoto',
    'crearProblemaInterno', 'crearProblemaExterno',
    'crearDepartamentoInterno', 'crearDepartamentoExterno', 'agregarHistorial',
    // DELETE
    'eliminarProblemaInterno', 'eliminarProblemaExterno',
    'eliminarDepartamentoInterno', 'eliminarDepartamentoExterno',
    // STORAGE
    'uploadFoto', 'getPublicUrl', 'eliminarFotoBucket',
  ]

  return { funcionesBackend, respuestaVacia }
})

vi.mock('@/services/supabaseController', () => ({
  API_URL: 'http://localhost:3000',
  esperarUsuario: vi.fn(() => Promise.resolve('token-de-prueba')),
  ...Object.fromEntries(funcionesBackend.map((n) => [n, vi.fn(respuestaVacia)])),
}))

vi.mock('@/services/geoAIController', () => ({
  validarAI: vi.fn(() =>
    Promise.resolve({ type: 0, success: true, error: null, data: { message: 'Imagen válida' } }),
  ),
}))

vi.mock('leaflet', () => {
  const crearMapa = (): any => {
    const mapa: any = {
      setView: vi.fn(() => mapa),
      on: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      flyTo: vi.fn(),
      invalidateSize: vi.fn(),
      closePopup: vi.fn(),
      getCenter: vi.fn(() => ({ lat: 24.8091, lng: -107.394 })),
    }
    return mapa
  }
  const crearCapa = (): any => {
    const capa: any = { addTo: vi.fn(() => capa), clearLayers: vi.fn() }
    return capa
  }
  const crearMarcador = (): any => {
    const marcador: any = { on: vi.fn(), addTo: vi.fn(() => marcador) }
    return marcador
  }
  const crearPopup = (): any => {
    const popup: any = {
      setLatLng: vi.fn(() => popup),
      setContent: vi.fn(() => popup),
      openOn: vi.fn(() => popup),
    }
    return popup
  }
  return {
    default: {
      map: vi.fn(crearMapa),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      layerGroup: vi.fn(crearCapa),
      marker: vi.fn(crearMarcador),
      divIcon: vi.fn(() => ({})),
      popup: vi.fn(crearPopup),
    },
  }
})

// Restaura las respuestas por defecto antes de cada prueba, por si algún spec
// llama a vi.resetAllMocks() o mockReset() y deja funciones sin implementación.
beforeEach(async () => {
  const supabase = await import('@/services/supabaseController')
  for (const nombre of funcionesBackend) {
    vi.mocked((supabase as any)[nombre]).mockImplementation(respuestaVacia)
  }
  vi.mocked(supabase.esperarUsuario).mockResolvedValue('token-de-prueba')
})

vi.stubGlobal('fetch', vi.fn())