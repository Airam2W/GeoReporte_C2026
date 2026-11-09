<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { iniciarSesion, menuAbierto, menuRef } from '../logic/home'
import ReporteDetalleModal from '../components/ReporteDetalleModal.vue'
import { obtenerReportePorFolio } from '../services/supabaseController'
import { onMounted, onUnmounted } from 'vue'

// Iconos de PrimeVue
import UserIcon from '@primeicons/vue/user'
import TimesIcon from '@primeicons/vue/times'

const router = useRouter()
const route = useRoute()

// Variables reactivas para controlar el modal
const modalVisible = ref(false)
const reporteEncontrado = ref<any>(null)

const irAReporte = () => {
  router.push('/reporte')
}

const modalBusquedaVisible = ref(false)
const folioInput = ref('')
const errorBusqueda = ref('')

const abrirModalBusqueda = () => {
  folioInput.value = ''
  errorBusqueda.value = ''
  modalBusquedaVisible.value = true
}

const handleClickOutsideMenu = (event: MouseEvent) => {
  if (menuAbierto.value && menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuAbierto.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutsideMenu)

  const folioUrl = route.query.folio
  if (folioUrl && typeof folioUrl === 'string') {
    folioInput.value = folioUrl.trim()
    ejecutarBusqueda()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutsideMenu)
})

const ejecutarBusqueda = async () => {
  if (!folioInput.value || !folioInput.value.trim()) {
    errorBusqueda.value = 'Por favor, ingresa el folio de tu reporte.'
    return
  }

  errorBusqueda.value = ''

  const { data, error } = await obtenerReportePorFolio(folioInput.value.trim())

  if (error || !data) {
    errorBusqueda.value = error?.message || error || 'No se encontró ningún reporte con ese folio.'
    console.log(!error, 'Error al buscar reporte:', error, 'Data:', data)
    return
  }

  modalBusquedaVisible.value = false
  reporteEncontrado.value = {
    ...data,
    estado: data.detalle_reporte?.estadoreporte?.estado || 'Pendiente',
    notas_rechazo: notasPorCategoriaRD(data.historial_reporte || [], 2),
  }
  modalVisible.value = true
}

const formatearNotaRD = (h: any) => {
  const fecha = new Date(h.fecha)
  return {
    fecha: fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
    hora: fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    titulo: h.titulo?.nombre || 'Sin título',
    notas: h.notas,
  }
}

const notasPorCategoriaRD = (historial: any[], categoria: number) =>
  historial
    .filter((h) => h.categoria_historial_id === categoria && h.notas)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .map(formatearNotaRD)

defineExpose({
  folioInput,
  errorBusqueda,
  modalBusquedaVisible,
  reporteEncontrado,
  modalVisible,
  ejecutarBusqueda,
  irAReporte,
  abrirModalBusqueda,
})
</script>

<template>
  <div class="home-layout">
    <!-- Formas de fondo estilo Prototipo (Círculos cortados y rutas) -->
    <div class="bg-path path-main"></div>
    <div class="bg-path path-sub"></div>

    <div class="bg-circle circle-tl"></div>
    <div class="bg-circle circle-tr"></div>
    <div class="bg-circle circle-bl"></div>
    <div class="bg-circle circle-br"></div>

    <!-- Logo Superior Izquierdo con contenedor de resalte -->
    <div class="top-left-bar">
      <div class="logo-ayuntamiento-container">
        <img src="../assets/logoAyuntamiento.svg" alt="Ayuntamiento de Culiacán" class="logo-ayuntamiento-top" />
      </div>
    </div>

    <!-- Botón superior derecho -->
    <div class="top-right-bar" ref="menuRef">
      <button class="btn-outline" @click="iniciarSesion">
        <UserIcon class="icono-btn" />
        Iniciar sesión
      </button>
    </div>

    <!-- Etiqueta inferior Ayuntamiento -->
    <div class="bottom-pill">
      Ayuntamiento de Culiacán | GeoReporte
    </div>

    <!-- Tarjeta Central Principal -->
    <main class="center-container">
      <div class="prototype-card">
        <div class="card-header">
          <img src="../assets/logo.png" alt="Logo GeoReporte" class="logo-georeporte-center" />
          <h1 class="card-title texto-tinto">GeoReporte</h1>
          <p class="card-subtitle">Plataforma ciudadana del Ayuntamiento de Culiacán para gestionar reportes de servicios públicos.</p>
        </div>

        <div class="card-section">
          <h3 class="section-label">¿Quieres hacer un reporte?</h3>
          <button class="btn-solid block-btn" @click="irAReporte">Crear reporte</button>
        </div>

        <div class="card-section">
          <h3 class="section-label">Ver estado de mi reporte</h3>
          <div class="inline-search">
            <input type="text" v-model="folioInput" placeholder="Escribe tu folio" @keyup.enter="ejecutarBusqueda" />
            <button class="btn-soft" @click="ejecutarBusqueda">Consultar</button>
          </div>
          <p v-if="errorBusqueda" class="msg-error-inline">{{ errorBusqueda }}</p>
        </div>
      </div>
    </main>

    <!-- Modal Detalles -->
    <ReporteDetalleModal :visible="modalVisible" :reporte="reporteEncontrado" :esAdmin="false"
      @close="modalVisible = false" @buscar="abrirModalBusqueda" />

    <!-- Modal Búsqueda (Oculto/Fallback) -->
    <transition name="fade">
      <div v-if="modalBusquedaVisible" class="modal-overlay">
        <div class="prototype-card">
          <button class="btn-close-abs" @click="modalBusquedaVisible = false" aria-label="Cerrar"><TimesIcon class="icono-btn" /></button>
          <div class="card-section" >
            <h2 class="section-label" style="font-size: 1.2rem;">Consultar Reporte</h2>
            <p class="card-subtitle" style="margin-bottom: 15px;">Ingresa el folio para verificar el estado.</p>
            <div class="inline-search">
              <input type="text" v-model="folioInput" placeholder="Ej. DEP-PRO-2026-..." @keyup.enter="ejecutarBusqueda" />
              <button class="btn-solid" @click="ejecutarBusqueda" style="padding: 10px 16px; border: none; border-radius: 8px;">Buscar</button>
            </div>
            <p v-if="errorBusqueda" class="msg-error-inline">{{ errorBusqueda }}</p>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style src="../assets/home.css"></style>
