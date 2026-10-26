<template>
  <transition name="fade-overlay">
    <div v-if="visible" class="loading-overlay">
      <div class="loading-card">
        <div class="loading-icono">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>

        <div class="spinner"></div>

        <h2 class="loading-titulo">GeoReporte</h2>
        <p class="loading-subtitulo">Panel de Gestión Interna</p>

        <p class="loading-mensaje">
          Bienvenido(a). Estamos preparando tu información para que puedas dar
          seguimiento a los reportes ciudadanos de forma eficiente.
        </p>

        <p class="loading-estado">Cargando información...</p>
      </div>

      <footer class="loading-footer">
        Ayuntamiento de Culiacán · Plataforma GeoReporte
      </footer>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useCargando } from '../composable/useCargando'
const { visible } = useCargando()
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(245, 243, 239, 0.97);
  backdrop-filter: blur(3px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 24px;
}

.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 380px;
  width: 100%;
}

.loading-icono {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background-color: #621132;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  box-shadow: 0 8px 20px rgba(98, 17, 50, 0.25);
}

.spinner {
  width: 46px;
  height: 46px;
  border: 5px solid #e5e0da;
  border-top-color: #621132;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
  margin-bottom: 24px;
}

.loading-titulo {
  font-size: 1.6rem;
  font-weight: 700;
  color: #621132;
  margin: 0 0 4px;
  letter-spacing: 0.3px;
}

.loading-subtitulo {
  font-size: 0.9rem;
  font-weight: 600;
  color: #2e7d32;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin: 0 0 20px;
}

.loading-mensaje {
  font-size: 0.95rem;
  color: #555;
  line-height: 1.6;
  margin: 0 0 18px;
}

.loading-estado {
  font-size: 0.85rem;
  font-weight: 600;
  color: #888;
  margin: 0;
  position: relative;
}

.loading-estado::after {
  content: '';
  display: inline-block;
  width: 1.2em;
  text-align: left;
  animation: dots 1.4s steps(4, end) infinite;
}

.loading-footer {
  position: absolute;
  bottom: 24px;
  font-size: 0.78rem;
  color: #999;
  text-align: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes dots {
  0% {
    content: '';
  }
  25% {
    content: '.';
  }
  50% {
    content: '..';
  }
  75% {
    content: '...';
  }
  100% {
    content: '';
  }
}

.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.25s ease;
}

.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}

@media (max-width: 420px) {
  .loading-titulo {
    font-size: 1.4rem;
  }

  .loading-mensaje {
    font-size: 0.88rem;
  }
}
</style>