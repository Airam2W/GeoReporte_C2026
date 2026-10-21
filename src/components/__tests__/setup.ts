import { vi } from 'vitest';

// Mock global del mapa
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({
      setView: vi.fn().mockReturnThis(),
      on: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      flyTo: vi.fn(),
      invalidateSize: vi.fn(),
      getCenter: vi.fn(() => ({ lat: 24.8091, lng: -107.3940 })),
    })),
    tileLayer: vi.fn(() => ({
      addTo: vi.fn(),
    })),
  },
}));

// Mock global del backend
vi.mock('@/services/supabaseController', () => ({
  // Genéricas
  selectAll: vi.fn(),
  selectNeq: vi.fn(),
  selectNeqOrder: vi.fn(),
  deleteEq: vi.fn(),
  selectIlike: vi.fn(),
  selectIlikeMaybeSingle: vi.fn(),
  selectEqSingle: vi.fn(),
  selectEq: vi.fn(),
  updateEq: vi.fn(),
  callRpc: vi.fn(),
  insert: vi.fn(),
  selectOrder: vi.fn(),
  selectEqOrder: vi.fn(),
  uploadFoto: vi.fn(),
  getPublicUrl: vi.fn(),
  esperarUsuario: vi.fn().mockResolvedValue(null),

  obtenerDepartamentosOrdenadosPorId: vi.fn(),
  obtenerProblemasPorDepartamentoID: vi.fn(),
  crearReporte: vi.fn(),
  crearDetalleReporte: vi.fn(),
  obtenerReportePorFolio: vi.fn(),
  obtenerDepartamentosinternosPorNombre: vi.fn(),
  obtenerDepartamentosExternosPorNombre: vi.fn(),
  obtenerProblematicasInternasPorNombre: vi.fn(),
  obtenerProblematicasExternasPorNombre: vi.fn(),
  obtenerProblematicasInternasPorID: vi.fn(),
  obtenerProblematicasExternasPorID: vi.fn(),
  obtenerAdministradoresInternosPorID: vi.fn(),
  obtenerAdministradoresExternosPorID: vi.fn(),
  obtenerCorreoUnico: vi.fn(),
  obtenerUsuarioPorCorreoYContrasena: vi.fn(),
  obtenerSupervisorIDPorUsuarioID: vi.fn(),
  obtenerJefeIDPorUsuarioID: vi.fn(),
}));

// Mock de la validación con IA de la foto (CrearReporte)
vi.mock('@/services/geoAIController', () => ({
  validarAI: vi.fn().mockResolvedValue({ type: 0, data: { message: 'Imagen válida' } }),
}));

// Mock de fetch global
global.fetch = vi.fn();