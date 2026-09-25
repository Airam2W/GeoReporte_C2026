<template>
  <div class="dashboard-layout">
    <!-- Barra Superior -->
    <nav class="topbar">
      <div class="topbar-logo">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          width="24"
          height="24"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <h1>GeoReporte | Panel de Control</h1>
      </div>
      <div class="topbar-user" v-if="admin">
        <div class="user-info">
          <span class="user-name">{{ admin.nombre }}</span>
          <span class="user-dept">¡Bienvenido!</span>
        </div>
        <button class="btn-logout" @click="cerrarSesion" title="Cerrar Sesión">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            width="18"
            height="18"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </nav>

    <!-- Contenido Principal -->
    <main class="dashboard-content">
      <header class="content-header" v-if="admin">
        <h2>Reportes del Departamento</h2>
        <!-- Cambiar por nombre del departamento -->
        <p>{{ admin.departamento }}</p>
      </header>

      <!-- Panel de Filtros -->
      <section class="filtros-card">
        <div class="filtro-grupo input-icono">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#888"
            stroke-width="2"
            width="18"
            height="18"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="filtros.busqueda"
            type="text"
            placeholder="Buscar por folio, nombre, teléfono o dirección..."
          />
        </div>

        <div class="filtro-grupo">
          <input v-model="filtros.fecha" type="date" title="Filtrar por fecha" />
        </div>

        <div class="filtro-grupo">
          <select v-model="filtros.problema">
            <option value="">Todos los problemas</option>
            <option v-for="prob in problemasOpciones" :key="prob.id" :value="prob.id">
              {{ prob.nombre }}
            </option>
          </select>
        </div>

        <div class="filtro-grupo">
          <select
            name="estado"
            id="estado"
            v-model="filtros.estado"
            :class="['badge', obtenerClaseEstado(filtros.estado.toLowerCase())]"
          >
            <option value="Llegado" class="badge-azul" selected>Llegado</option>
            <option value="En Proceso" class="badge-amarillo">En Proceso</option>
            <option value="Finalizado" class="badge-verde">Finalizado</option>
            <option value="Rechazado" class="badge-rojo">Rechazado</option>
            <option value="Turnado" class="badge-purpura">Turnado</option>
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
              <td class="font-bold">{{ reporte.problemas?.nombre }}</td>
              <td :title="reporte.domicilio">{{ truncarTexto(reporte.domicilio, 25) }}</td>
              <td>
                <div class="ciudadano-info">
                  <span>{{ reporte.nombre }}</span>
                  <small>{{ reporte.telefono }}</small>
                </div>
              </td>
              <td class="acciones-celda">
                <button
                  class="btn-accion btn-ver"
                  title="Ver detalle"
                  @click="abrirModalVer(reporte)"
                >
                  👁️
                </button>

                <button
                  v-if="reporte.estado === 'Llegado'"
                  class="btn-accion btn-asignar"
                  title="Asignar supervisor"
                  @click="asignarReporte(reporte.folio)"
                >
                  👤
                </button>

                <button
                  v-if="reporte.estado === 'Finalizado'"
                  class="btn-accion btn-devolver"
                  title="Devolver a En Proceso"
                  @click="devolverReporte(reporte.folio, 'En Proceso')"
                >
                  ⬅️
                </button>

                <button
                  v-if="reporte.estado === 'Rechazado'"
                  class="btn-accion btn-devolver"
                  title="Devolver a Llegado"
                  @click="devolverReporte(reporte.folio, 'Llegado')"
                >
                  ↩️
                </button>

                <button
                  v-if="reporte.estado !== 'Rechazado' && reporte.estado !== 'Turnado'"
                  class="btn-accion btn-rechazar"
                  title="Rechazar reporte"
                  @click="rechazarReporte(reporte.folio)"
                >
                  ❌
                </button>
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
      @rechazar="rechazarReporte"
      @devolver="devolverReporte"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase' // Ajusta la ruta a tu supabase.ts
import ReporteDetalleModal from '../components/ReporteDetalleModal.vue'
import Swal from 'sweetalert2'
import { truncarTexto, obtenerClaseEstado } from '../logic/panelAdministrador'

const router = useRouter()
const admin = ref<any>(null)
const cargando = ref(true)
const reportes = ref<any[]>([])
const foliosProcesando = ref(new Set<string>())
const problemasOpciones = ref<any[]>([])

// Estado del Modal de Ver Reporte
const modalVisible = ref(false)
const reporteActivo = ref<any>(null)

const filtros = ref({
  busqueda: '',
  fecha: '',
  problema: '',
  estado: 'Llegado',
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
  // Traer solo problemas del departamento del admin
  const { data: problemasData, error: problemasError } = await supabase
    .from('problemas')
    .select('id, nombre, departamento_id')
    .eq('departamento_id', admin.value.departamento_id)

  if (problemasError) {
    console.error('Error al cargar problemas:', problemasError.message)
  } else {
    problemasOpciones.value = problemasData || []
  }

  // Traer nombre del departamento para mostrarlo en el header
  const { data: deptData, error: deptError } = await supabase
    .from('departamentos')
    .select('id, nombre')
    .eq('id', admin.value.departamento_id)

  if (deptError) {
    console.error('Error al cargar departamento:', deptError.message)
  } else if (deptData && deptData.length > 0) {
    admin.value.departamento = deptData[0].nombre
  }
}

const cargarReportes = async () => {
  cargando.value = true
  const { data, error } = await supabase
    .from('reportes')
    .select(
      `
      folio, descripcion, nombre, telefono, domicilio, referencias, foto_url, created_at,
      problemas (id, nombre),
      detalle_reporte (
        estado_id,
        estadoreporte (estado)
      )
    `,
    )
    .eq('departamento_id', admin.value.departamento_id)
    .order('created_at', { ascending: false })

  if (!error && data) {
    reportes.value = data.map((r) => ({
      ...r,
      estado: r.detalle_reporte?.estadoreporte?.estado || 'Llegado',
    }))
  }
  cargando.value = false
}

// Filtros en tiempo real
const reportesFiltrados = computed(() => {
  return reportes.value.filter((r) => {
    const q = filtros.value.busqueda.toLowerCase()
    const coincideBusqueda =
      r.folio.toLowerCase().includes(q) ||
      r.nombre.toLowerCase().includes(q) ||
      r.domicilio.toLowerCase().includes(q) ||
      r.telefono.includes(q)

    const coincideProblema =
      filtros.value.problema === '' || r.problemas?.id == filtros.value.problema

    const coincideEstado = filtros.value.estado === '' || r.estado === filtros.value.estado

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

    return coincideBusqueda && coincideProblema && coincideEstado && coincideFecha
  })
})

// Lógica de Modales y Acciones
const abrirModalVer = (reporte: any) => {
  reporteActivo.value = reporte
  modalVisible.value = true
}

const cerrarModalVer = () => {
  modalVisible.value = false
  setTimeout(() => {
    reporteActivo.value = null
  }, 300)
}

const rechazarReporte = async (folio: string) => {
  if (foliosProcesando.value.has(folio)) return
    foliosProcesando.value.add(folio)
    try {
  const result = await Swal.fire({
    title: '¿Rechazar reporte?',
    text: `¿Estás seguro de que deseas rechazar el folio ${folio}? Esta acción lo marcará como rechazado.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#888',
    confirmButtonText: 'Sí, rechazar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
  })

  if (result.isConfirmed) {
    const { error } = await supabase
      .from('detalle_reporte')
      .update({ estado_id: 3 })
      .eq('folio', folio)

    if (!error) {
      const index = reportes.value.findIndex((r) => r.folio === folio)
      if (index !== -1) reportes.value[index].estado = 'Rechazado'

      Swal.fire({
        title: '¡Rechazado!',
        text: 'El reporte ha sido rechazado correctamente.',
        icon: 'success',
        confirmButtonColor: '#1a6b2f',
      })
    } else {
      // Alerta de error
      Swal.fire({
        title: 'Error',
        text: 'Hubo un error al rechazar el reporte en la base de datos.',
        icon: 'error',
        confirmButtonColor: '#1a6b2f',
        })
      }
    }
  } 
  finally{
     foliosProcesando.value.delete(folio)
    }
}

const buscarEstadoId = async (estado: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('estadoreporte')
      .select('id')
      .eq('estado', estado)
      .single()

    if (error) {
      console.error('Error al buscar estado:', error.message)
      return null
    }

    return data?.id ?? null
  } catch (err: any) {
    console.error('Error inesperado en buscarEstadoId:', err.message)
    return null
  }
}

const devolverReporte = async (folio: string, nuevoEstado: 'En Proceso' | 'Llegado') => {
  if (foliosProcesando.value.has(folio)) return
    foliosProcesando.value.add(folio)
    try {
  const result = await Swal.fire({
    title: `¿Devolver a "${nuevoEstado}"?`,
    text: `El folio ${folio} cambiará su estado a "${nuevoEstado}".`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#1a6b2f',
    cancelButtonColor: '#888',
    confirmButtonText: 'Sí, devolver',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
  })

  if (result.isConfirmed) {
    const estadoId = await buscarEstadoId(nuevoEstado)
    if (!estadoId) {
      Swal.fire({
        title: 'Error',
        text: 'No se encontró el estado en la base de datos.',
        icon: 'error',
        confirmButtonColor: '#1a6b2f',
      })
      return
    }

    const { error } = await supabase
      .from('detalle_reporte')
<<<<<<< HEAD
      .update({ estado_id: estadoId })
=======
      .update({ estado: nuevoEstado })
>>>>>>> 378c2d2fe6451a7f5803ad15c7560854c0d6379e
      .eq('folio', folio)

    if (!error) {
      const index = reportes.value.findIndex((r) => r.folio === folio)
      if (index !== -1) reportes.value[index].estado = nuevoEstado

      Swal.fire({
        title: '¡Actualizado!',
        text: `El reporte ahora está en "${nuevoEstado}".`,
        icon: 'success',
        confirmButtonColor: '#1a6b2f',
      })
    } else {
      Swal.fire({
          title: 'Error',
          text: 'Hubo un error al actualizar el estado en la base de datos.',
          icon: 'error',
          confirmButtonColor: '#1a6b2f',
        })
      }
    } 
  }finally {
    foliosProcesando.value.delete(folio)
  }
}


const asignarReporte = (folio: string | undefined) => {
  //Desactivar el boton Asginar Reporte
  const asignarBtn = document.querySelector('.btn-asignar') as HTMLButtonElement
  asignarBtn.disabled = true

  if (!folio) return
  Swal.fire({
    title: 'Asignar Supervisor',
    text: `Aquí iría la lógica para asignar el folio ${folio}`,
    icon: 'info',
    confirmButtonColor: '#1a6b2f',
  })

  // Reactivar el boton Asignar Reporte
  asignarBtn.disabled = false
}

const cerrarSesion = () => {
  localStorage.removeItem('adminSession')
  router.push('/')
}

defineExpose({
  admin,
  cargando,
  reportes,
  problemasOpciones,
  filtros,
  reportesFiltrados,
  modalVisible,
  reporteActivo,
  abrirModalVer,
  cerrarModalVer,
  rechazarReporte,
  devolverReporte,
  asignarReporte,
  cerrarSesion,
  foliosProcesando,
})
</script>

<style src="../assets/panelAdministrador.css"></style>
