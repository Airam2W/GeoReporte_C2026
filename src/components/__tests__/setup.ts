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
}));

// Mock de fetch global
global.fetch = vi.fn();