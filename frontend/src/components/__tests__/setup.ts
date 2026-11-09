import { vi } from 'vitest';

// Lista de todas las funciones exportadas por supabaseController.ts
const { funcionesBackend } = vi.hoisted(() => ({
  funcionesBackend: [
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
    'actualizarReporteADepartamentoExterno',
    // POST
    'obtenerUsuarioPorCorreoYContrasena', 'guardarUsuario', 'crearReporte',
    'crearDetalleReporte', 'crearHistorialReporte', 'crearHistorialReporteConFoto',
    'crearProblemaInterno', 'crearProblemaExterno',
    'crearDepartamentoInterno', 'crearDepartamentoExterno',
    // DELETE
    'eliminarProblemaInterno', 'eliminarProblemaExterno',
    'eliminarDepartamentoInterno', 'eliminarDepartamentoExterno',
    // STORAGE
    'uploadFoto', 'getPublicUrl',
  ],
}))

// Mock global del mapa (déjalo igual que lo tenías)
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
  API_URL: 'http://localhost:3000',
  esperarUsuario: vi.fn().mockResolvedValue('token-de-prueba'),
  ...Object.fromEntries(funcionesBackend.map((nombre) => [nombre, vi.fn()])),
}));

// Mock de la validación con IA de la foto (CrearReporte)
vi.mock('@/services/geoAIController', () => ({
  validarAI: vi.fn().mockResolvedValue({ type: 0, success: true, error: null, data: { message: 'Imagen válida' } }),
}));

// Mock de fetch global
global.fetch = vi.fn();