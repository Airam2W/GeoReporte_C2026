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

// Mock global de Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

// Mock de fetch global
global.fetch = vi.fn();