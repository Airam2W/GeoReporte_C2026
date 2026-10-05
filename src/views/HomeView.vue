<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { iniciarSesion, menuAbierto, menuRef } from '../logic/home'
import ReporteDetalleModal from '../components/ReporteDetalleModal.vue'
import { selectEqSingle } from '../services/supabaseController'
import { onMounted, onUnmounted } from 'vue'



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

// Funcion para cerrar el menu al hacer clic fuera de él
const handleClickOutsideMenu = (event: MouseEvent) => {
  if (menuAbierto.value && menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuAbierto.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutsideMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutsideMenu)
})

// Reemplaza buscarReporteCiudadano con esta versión:
const ejecutarBusqueda = async () => {
  if (!folioInput.value || !folioInput.value.trim()) {
    errorBusqueda.value = 'Por favor, ingresa el folio de tu reporte.'
    return
  }

  errorBusqueda.value = ''

  const { data, error } = await selectEqSingle('reportes', 'folio', folioInput.value.trim(), [
    'folio',
    'descripcion',
    'nombre',
    'telefono',
    'domicilio',
    'referencias',
    'foto_url',
    'created_at',
    'problemas (nombreamigable)',
    'detalle_reporte ( estado_id, estadoreporte (estado) )',
  ])

  if (error || !data) {
    errorBusqueda.value = 'No se encontró ningún reporte con ese folio.'
    console.log(!error, 'Error al buscar reporte:', error, 'Data:', data)
    return
  }

  // Si tiene éxito, cerramos este modal y abrimos el de los detalles
  modalBusquedaVisible.value = false
  reporteEncontrado.value = {
    ...data,
    estado: data.detalle_reporte?.estadoreporte?.estado || 'Pendiente',
  }
  modalVisible.value = true
}
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
  <div class="home">
    <!-- ===== ENCABEZADO INSTITUCIONAL ===== -->
    <header class="home-header">
      <div class="header-top">
        <div class="header-logos">
          <img src="../assets/logo.png" alt="Logo GeoReporte" class="logo" />
          <img
            src="../assets/logoAyuntamiento.png"
            alt="Logo Ayuntamiento de Culiacán"
            class="logo-ayuntamiento"
          />
        </div>

        <!-- Menú desplegable -->
        <nav class="menu" ref="menuRef">
          <button
            class="menu-btn"
            @click="menuAbierto = !menuAbierto"
            aria-haspopup="true"
            :aria-expanded="menuAbierto"
            aria-label="Abrir menú"
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <line x1="4" y1="7" x2="20" y2="7"></line>
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <line x1="4" y1="17" x2="20" y2="17"></line>
            </svg>
          </button>
          <transition name="fade">
            <ul v-if="menuAbierto" class="menu-list" name="modal-IniciarSesion">
              <li @click="iniciarSesion">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                  <polyline points="10 17 15 12 10 7"></polyline>
                  <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                Iniciar sesión
              </li>
            </ul>
          </transition>
        </nav>
      </div>

      <!-- Banner del ayuntamiento -->
      <!-- <div class="header-banner">
        <img src="../assets/bannerAyuntamientoTinto.png" alt="Banner Ayuntamiento de Culiacán" class="banner-ayuntamiento banner-tinto" />
        <img src="../assets/bannerAyuntamientoDorado.png" alt="Banner Ayuntamiento de Culiacán" class="banner-ayuntamiento banner-dorado" />
      </div> -->

      <div class="header-titulo">
        <h1 class="titulo">GeoReporte</h1>
        <p class="descripcion">
          Plataforma ciudadana del Ayuntamiento de Culiacán para gestionar reportes de servicios
          públicos.
        </p>
      </div>
    </header>

    <!-- ===== CONTENIDO PRINCIPAL ===== -->
    <main class="home-main">
      <section class="acciones-grid">
        <article class="accion-card">
          <div class="accion-icono accion-icono-verde">
            <svg
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 2v20M2 12h20"></path>
            </svg>
          </div>
          <h2>¿Quieres hacer un reporte?</h2>
          <p>Levanta un reporte de un servicio público y da seguimiento a su solución.</p>
          <button class="btn btn-verde" @click="irAReporte">Crear reporte</button>
        </article>

        <article class="accion-card">
          <div class="accion-icono accion-icono-cafe">
            <svg
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h2>Ver estado de mi reporte</h2>
          <p>Consulta el avance de un reporte que ya enviaste usando tu número de folio.</p>
          <button class="btn btn-cafe" @click="abrirModalBusqueda">Ver reporte</button>
        </article>
      </section>
    </main>

    <footer class="home-footer">
      <p>Ayuntamiento de Culiacán · Plataforma GeoReporte</p>
    </footer>

    <!-- ===== MODALES ===== -->
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
            <button
              class="btn-cerrar-delgado"
              @click="modalBusquedaVisible = false"
              aria-label="Cerrar"
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                stroke="currentColor"
                stroke-width="1.5"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-busqueda-body">

            <label class="label-folio">Folio del reporte</label>
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
