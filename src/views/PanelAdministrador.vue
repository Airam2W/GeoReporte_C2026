<template>
  <div class="dashboard-layout">
    <!-- Barra Superior -->
    <nav class="topbar">
      <div class="topbar-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <h1>GeoReporte | Panel de Control</h1>
      </div>
      <div class="topbar-user" v-if="admin">
        <div class="user-info">
          <span class="user-name">{{ admin.nombre }}</span>
          <span class="user-dept">Depto. {{ admin.departamento_id }}</span>
        </div>
        <button class="btn-logout" @click="cerrarSesion">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </nav>

    <!-- Contenido Principal -->
    <main class="dashboard-content">
      <header class="content-header">
        <h2>Reportes del Departamento</h2>
        <p>Gestiona, asigna y da seguimiento a las solicitudes ciudadanas.</p>
      </header>

      <!-- Panel de Filtros -->
      <section class="filtros-card">
        <div class="filtro-grupo input-icono">
          <svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" width="18" height="18">
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input v-model="filtros.busqueda" type="text" placeholder="Buscar por folio, nombre, teléfono o dirección..." />
        </div>

        <div class="filtro-grupo">
          <input v-model="filtros.fecha" type="date" title="Filtrar por fecha" />
        </div>

        <div class="filtro-grupo">
          <select v-model="filtros.problema">
            <option value="">Todos los problemas</option>
            <option v-for="prob in problemasOpciones" :key="prob.id" :value="prob.id">
              {{ prob.nombreamigable }}
            </option>
          </select>
        </div>
      </section>

      <!-- Tabla de Datos -->
      <div class="tabla-contenedor">
        <table class="tabla-reportes">
          <thead>
            <tr>
              <th>FOLIO</th>
              <th>PROBLEMA</th>
              <th>DOMICILIO</th>
              <th>CIUDADANO</th>
              <th>ESTADO</th>
              <th class="text-center">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando" class="fila-vacia">
              <td colspan="6">Cargando reportes...</td>
            </tr>
            <tr v-else-if="reportesFiltrados.length === 0" class="fila-vacia">
              <td colspan="6">No se encontraron reportes con estos filtros.</td>
            </tr>
            <tr v-else v-for="reporte in reportesFiltrados" :key="reporte.folio" class="fila-datos">
              <td class="font-mono">#{{ reporte.folio.split('-')[4] || reporte.folio }}</td>
              <td class="font-bold">{{ reporte.problemas?.nombreamigable }}</td>
              <td :title="reporte.domicilio">{{ truncarTexto(reporte.domicilio, 25) }}</td>
              <td>
                <div class="ciudadano-info">
                  <span>{{ reporte.nombre }}</span>
                  <small>{{ reporte.telefono }}</small>
                </div>
              </td>
              <td>
                <span :class="['badge', obtenerClaseEstado(reporte.estado.toLowerCase())]">
                  {{ reporte.estado }}
                </span>
              </td>
              <td class="acciones-celda">
                <button class="btn-accion btn-ver" title="Ver detalle" @click="abrirModalVer(reporte)">👁️</button>
                <button class="btn-accion btn-asignar" title="Asignar supervisor" @click="asignarReporte(reporte.folio)">👤</button>
                <button class="btn-accion btn-rechazar" title="Rechazar reporte" @click="rechazarReporte(reporte.folio)">❌</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <ReporteDetalleModal
      :visible="modalVisible"
      :reporte="reporteActivo"
      :esAdmin="true"
      @close="cerrarModalVer"
      @asignar="asignarReporte"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase' // Ajusta la ruta a tu supabase.ts
import ReporteDetalleModal from '../components/ReporteDetalleModal.vue'
import Swal from 'sweetalert2'

const router = useRouter()
const admin = ref<any>(null)
const cargando = ref(true)
const reportes = ref<any[]>([])
const problemasOpciones = ref<any[]>([])

// Estado del Modal de Ver Reporte
const modalVisible = ref(false)
const reporteActivo = ref<any>(null)

const filtros = ref({
  busqueda: '',
  fecha: '',
  problema: ''
})

onMounted(async () => {
  const sessionData = localStorage.getItem('adminSession')
  if (!sessionData) {
    router.push('/')
    return
  }
  admin.value = JSON.parse(sessionData)

  await cargarCatalogos()
  await cargarReportes()
})

const cargarCatalogos = async () => {
  const { data } = await supabase
    .from('problemas')
    .select('id, nombreamigable')
    .eq('departamento_id', admin.value.departamento_id)
  if (data) problemasOpciones.value = data
}


const cargarReportes = async () => {
  cargando.value = true
  const { data, error } = await supabase
    .from('reportes')
    .select(`
      folio, descripcion, nombre, telefono, domicilio, referencias, foto_url, created_at,
      problemas (id, nombreamigable),
      reportesexistentes (estado)
    `)
    .eq('departamento_id', admin.value.departamento_id)
    .order('created_at', { ascending: false })

  if (!error && data) {
    reportes.value = data.map(r => ({
      ...r,
      estado: r.reportesexistentes?.[0]?.estado || 'Llegado'
    }))
  }
  cargando.value = false
}

const truncarTexto = (texto: string, limite: number) => {
  if (!texto) return ''
  return texto.length > limite ? texto.slice(0, limite) + '...' : texto
}

// Filtros en tiempo real
const reportesFiltrados = computed(() => {
  return reportes.value.filter(r => {
    const q = filtros.value.busqueda.toLowerCase()
    const coincideBusqueda =
      r.folio.toLowerCase().includes(q) ||
      r.nombre.toLowerCase().includes(q) ||
      r.domicilio.toLowerCase().includes(q) ||
      r.telefono.includes(q)

    const coincideProblema = filtros.value.problema === '' || r.problemas?.id == filtros.value.problema

    let coincideFecha = true
    if (filtros.value.fecha) {
      const fechaUtc = r.created_at.endsWith('Z') ? r.created_at : `${r.created_at}Z`

      const fechaLocal = new Date(fechaUtc)

      const year = fechaLocal.getFullYear()
      const month = String(fechaLocal.getMonth() + 1).padStart(2, '0')
      const day = String(fechaLocal.getDate()).padStart(2, '0')

      const fechaFormateadaLocal = `${year}-${month}-${day}`

      coincideFecha = fechaFormateadaLocal === filtros.value.fecha
    }

    return coincideBusqueda && coincideProblema && coincideFecha
  })
})

const obtenerClaseEstado = (estado: string) => {
  const clases: Record<string, string> = {
    'llegado': 'badge-azul',
    'en proceso': 'badge-amarillo',
    'finalizado': 'badge-verde',
    'rechazado': 'badge-rojo'
  }
  return clases[estado] || 'badge-gris'
}

// Lógica de Modales y Acciones
const abrirModalVer = (reporte: any) => {
  reporteActivo.value = reporte
  modalVisible.value = true
}

const cerrarModalVer = () => {
  modalVisible.value = false
  setTimeout(() => { reporteActivo.value = null }, 300)
}

const rechazarReporte = async (folio: string) => {
  const result = await Swal.fire({
    title: '¿Rechazar reporte?',
    text: `¿Estás seguro de que deseas rechazar el folio ${folio}? Esta acción lo marcará como cerrado.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#888',
    confirmButtonText: 'Sí, rechazar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true
  })

  if (result.isConfirmed) {
    const { error } = await supabase
      .from('reportesexistentes')
      .update({ estado: 'Rechazado' })
      .eq('folio', folio)

    if (!error) {
      const index = reportes.value.findIndex(r => r.folio === folio)
      if (index !== -1) reportes.value[index].estado = 'Rechazado'

      Swal.fire({
        title: '¡Rechazado!',
        text: 'El reporte ha sido rechazado correctamente.',
        icon: 'success',
        confirmButtonColor: '#1a6b2f'
      })
    } else {
      // Alerta de error
      Swal.fire({
        title: 'Error',
        text: 'Hubo un error al rechazar el reporte en la base de datos.',
        icon: 'error',
        confirmButtonColor: '#1a6b2f'
      })
    }
  }
}

const asignarReporte = (folio: string | undefined) => {
  if(!folio) return
  Swal.fire({
    title: 'Asignar Supervisor',
    text: `Aquí iría la lógica para asignar el folio ${folio}`,
    icon: 'info',
    confirmButtonColor: '#1a6b2f'
  })

}

const cerrarSesion = () => {
  localStorage.removeItem('adminSession')
  router.push('/')
}
</script>

<style scoped>
/* ==========================================
   DISEÑO DEL DASHBOARD Y TABLA
========================================== */
.dashboard-layout {
  min-height: 100vh;
  background-color: #f4f7f6;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #333;
}

.topbar {
  background-color: #1a6b2f;
  color: white;
  padding: 0 24px;
  height: 64px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.topbar-logo { display: flex; align-items: center; gap: 10px; }
.topbar-logo h1 { font-size: 1.2rem; font-weight: 600; margin: 0; }

.topbar-user { display: flex; align-items: center; gap: 16px; }
.user-info { display: flex; flex-direction: column; text-align: right; }
.user-name { font-weight: 600; font-size: 0.95rem; }
.user-dept { font-size: 0.75rem; opacity: 0.8; }
.btn-logout {
  background: rgba(255,255,255,0.1); border: none; color: white;
  padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s;
}
.btn-logout:hover { background: rgba(255,255,255,0.2); }

.dashboard-content { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
.content-header h2 { font-size: 1.8rem; color: #1a6b2f; margin-bottom: 4px; }
.content-header p { color: #666; margin-bottom: 24px; }

/* Filtros */
.filtros-card {
  background: white; padding: 16px; border-radius: 12px;
  display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #eaeaea;
}
.filtro-grupo { flex: 1; min-width: 200px; position: relative; }
.filtro-grupo input, .filtro-grupo select {
  width: 100%; padding: 10px 14px; border: 1px solid #ddd;
  border-radius: 8px; font-size: 0.95rem; outline: none; transition: 0.2s;
}
.filtro-grupo input:focus, .filtro-grupo select:focus { border-color: #1a6b2f; }
.input-icono svg { position: absolute; left: 12px; top: 12px; }
.input-icono input { padding-left: 36px; }

/* Tabla */
.tabla-contenedor {
  background: white; border-radius: 12px; overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #eaeaea;
  overflow-x: auto;
}
.tabla-reportes { width: 100%; border-collapse: collapse; text-align: left; }
.tabla-reportes th { background: #f9fafb; padding: 14px 16px; font-size: 0.85rem; color: #555; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid #eaeaea; }
.tabla-reportes td { padding: 14px 16px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
.fila-datos:hover { background-color: #f4faf4; }
.fila-vacia td { text-align: center; padding: 32px; color: #888; }

.font-mono { font-family: monospace; color: #666; }
.font-bold { font-weight: 600; color: #222; }
.ciudadano-info { display: flex; flex-direction: column; }
.ciudadano-info small { color: #777; font-size: 0.8rem; }
.text-center { text-align: center; }

/* Badges de Estado */
.badge { padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: inline-block; }
.badge-grande { padding: 8px 16px; font-size: 1rem; }
.badge-azul { background: #e3f2fd; color: #1976d2; }
.badge-amarillo { background: #fff8e1; color: #f57f17; }
.badge-verde { background: #e8f5e9; color: #2e7d32; }
.badge-rojo { background: #ffebee; color: #c62828; }
.badge-gris { background: #f5f5f5; color: #616161; }

/* Botones Acción */
.acciones-celda { display: flex; gap: 8px; justify-content: center; }
.btn-accion {
  width: 32px; height: 32px; border: none; border-radius: 6px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  background: #f5f5f5; transition: 0.2s;
}
.btn-ver:hover { background: #e3f2fd; }
.btn-asignar:hover { background: #fff8e1; }
.btn-rechazar:hover { background: #ffebee; }

/* ==========================================
   DISEÑO DEL MODAL "VER REPORTE"
========================================== */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; justify-content: center; align-items: center; z-index: 1000;
}
.modal-card {
  background: white; width: 90%; max-width: 800px; max-height: 90vh;
  border-radius: 16px; display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}
.modal-header {
  padding: 20px 24px; border-bottom: 1px solid #eee; display: flex;
  justify-content: space-between; align-items: center; background: #fafafa;
}
.modal-header h3 { margin: 0; font-size: 1.4rem; color: #1a6b2f; }
.folio-text { margin: 4px 0 0; color: #666; font-family: monospace; font-size: 0.9rem; }
.btn-cerrar { background: none; border: none; font-size: 1.5rem; color: #aaa; cursor: pointer; }
.btn-cerrar:hover { color: #333; }

.modal-body { padding: 24px; overflow-y: auto; flex: 1; }
.modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }

.info-columna { display: flex; flex-direction: column; gap: 16px; }
.info-item label { display: block; font-size: 0.8rem; color: #777; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
.info-item p { margin: 0; font-size: 1rem; color: #222; }
.info-item .destacado { font-weight: 700; font-size: 1.1rem; color: #1a6b2f; }
.descripcion-box { background: #f9f9f9; padding: 12px; border-radius: 8px; border: 1px solid #eee; font-size: 0.95rem; line-height: 1.5; color: #444; }
.referencias { font-size: 0.85rem !important; color: #666 !important; margin-top: 4px !important; font-style: italic; }
.info-grupo-doble { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.foto-columna { display: flex; flex-direction: column; gap: 16px; }
.foto-columna label { display: block; font-size: 0.8rem; color: #777; text-transform: uppercase; font-weight: 600; }
.foto-contenedor {
  width: 100%; aspect-ratio: 4/3; background: #eee; border-radius: 12px;
  overflow: hidden; display: flex; align-items: center; justify-content: center;
}
.foto-contenedor img { width: 100%; height: 100%; object-fit: cover; }
.sin-foto { color: #aaa; font-style: italic; }

.estado-actual-box { background: #f9f9f9; padding: 16px; border-radius: 12px; text-align: center; border: 1px solid #eee; }
.estado-actual-box label { margin-bottom: 8px; }

.modal-footer {
  padding: 16px 24px; border-top: 1px solid #eee; display: flex;
  justify-content: flex-end; gap: 12px; background: #fafafa;
}
.btn-secundario, .btn-primario {
  padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; transition: 0.2s;
}
.btn-secundario { background: #e0e0e0; color: #333; }
.btn-secundario:hover { background: #d0d0d0; }
.btn-primario { background: #1a6b2f; color: white; }
.btn-primario:hover { background: #145524; }

/* Animación del modal */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .modal-grid { grid-template-columns: 1fr; }
  .info-grupo-doble { grid-template-columns: 1fr; }
}
</style>
