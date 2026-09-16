import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    numTestsKeptInMemory: 5,
    experimentalMemoryManagement: true,
    specPattern: 'cypress/e2e/**/*.{cy,spec}.{js,jsx,ts,tsx}',
    baseUrl: 'http://localhost:4173/GeoReporte_C2026/',
  },
})
