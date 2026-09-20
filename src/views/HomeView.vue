<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { iniciarSesionAdmin, menuAbierto, menuRef } from '../logic/home'
import ReporteDetalleModal from '../components/ReporteDetalleModal.vue'

const router = useRouter()

// Variables reactivas para controlar el modal
const modalVisible = ref(false)
const reporteEncontrado = ref<any>(null)

const irAReporte = () => {
  router.push('/reporte')
}

// Nuevas variables para el modal de búsqueda
const modalBusquedaVisible = ref(false)
const folioInput = ref('')
const errorBusqueda = ref('')

const abrirModalBusqueda = () => {
  folioInput.value = ''
  errorBusqueda.value = ''
  modalBusquedaVisible.value = true
}

// Reemplaza buscarReporteCiudadano con esta versión:
const ejecutarBusqueda = async () => {
  if (!folioInput.value || !folioInput.value.trim()) {
    errorBusqueda.value = 'Por favor, ingresa el folio de tu reporte.'
    return
  }

  errorBusqueda.value = ''

  const { data, error } = await supabase
    .from('reportes')
    .select(`
      folio, descripcion, nombre, telefono, domicilio, referencias, foto_url, created_at,
      problemas (nombreamigable),
      detalle_reporte (
        estado_id,
        estadoreporte (estado)
      )
    `)
    .eq('folio', folioInput.value.trim())
    .single()


  if (error || !data) {
    errorBusqueda.value = 'No se encontró ningún reporte con ese folio.'
    return
  }


  // Si tiene éxito, cerramos este modal y abrimos el de los detalles
  modalBusquedaVisible.value = false
  reporteEncontrado.value = {
    ...data,
    estado: data.reportesexistentes?.[0]?.estado || 'Llegado'
  }
  modalVisible.value = true
}
defineExpose({
  folioInput, errorBusqueda, modalBusquedaVisible,
  reporteEncontrado, modalVisible, ejecutarBusqueda,
  irAReporte, abrirModalBusqueda
})
</script>

<template>
  <div class="home">
    <header class="home-header">
      <img src="../assets/logo.png" alt="Logo GeoReporte" class="logo" />
      <h1 class="titulo">GeoReporte</h1>
      <p class="descripcion">
        Plataforma ciudadana del Ayuntamiento de Culiacán para gestionar reportes de servicios públicos.
      </p>

      <!-- Menú desplegable arriba a la derecha -->
      <nav class="menu" ref="menuRef">
        <button
          class="menu-btn"
          @click="menuAbierto = !menuAbierto"
          aria-haspopup="true"
          :aria-expanded="menuAbierto"
        >
          ☰
        </button>
        <transition name="fade">
          <ul v-if="menuAbierto" class="menu-list">
            <li @click="iniciarSesionAdmin">Iniciar sesión</li>
          </ul>
        </transition>
      </nav>
    </header>

    <main class="home-main">
      <section class="acciones">
        <h2>¿Quieres hacer un reporte?</h2>
        <button class="btn btn-verde" @click="irAReporte">Crear reporte</button>
      </section>

      <section class="acciones">
        <h2>Ver estado de mi reporte</h2>
        <button class="btn btn-cafe" @click="abrirModalBusqueda">Ver reporte</button>
      </section>
    </main>

    <ReporteDetalleModal
      :visible="modalVisible"
      :reporte="reporteEncontrado"
      :esAdmin="false"
      @close="modalVisible = false"
      @buscar="abrirModalBusqueda"
    />

    <transition name="fade">
      <div v-if="modalBusquedaVisible" class="modal-overlay">
        <div class="modal-busqueda">
          <div class="modal-busqueda-header">
            <h3>Consultar Reporte</h3>
            <button class="btn-cerrar-delgado" @click="modalBusquedaVisible = false">

              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-busqueda-body">
            <label class="label-folio">Folio del reporte:</label>
            <div class="input-grupo">
              <input
                type="text"
                v-model="folioInput"
                placeholder="Ej. DEP-PRO-2026-..."
                @keyup.enter="ejecutarBusqueda"
              />
              <button class="btn-buscar-verde" @click="ejecutarBusqueda">Buscar</button>
            </div>
            <p v-if="errorBusqueda" class="msg-error-modal">{{ errorBusqueda }}</p>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style src="../assets/home.css"></style>
