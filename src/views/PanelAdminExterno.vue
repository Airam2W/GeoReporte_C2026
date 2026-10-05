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
        <h1>GeoReporte | Administrador Externo</h1>
      </div>
      <div class="topbar-user" v-if="admin">
        <div class="user-info">
          <span class="user-name">{{ admin.nombre }}</span>
          <span class="user-dept">{{ admin.departamento }}</span>
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
        <h2>Reportes Turnados a su Dependencia</h2>
        <p>Consulte el detalle de los reportes recibidos y actualice su estado de atención.</p>
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
          <select
            name="estado"
            id="estado"
            v-model="filtros.estado"
            :class="['badge', obtenerClaseEstado(filtros.estado.toLowerCase())]"
          >
            <option value="Pendiente" class="badge-azul" selected>Pendiente</option>
            <option value="Finalizado" class="badge-verde">Finalizado</option>
            <option value="Rechazado" class="badge-rojo">Rechazado</option>
          </select>
        </div>
      </section>

      <!-- Tabla de Datos -->
      <div class="tabla-contenedor">
        <table class="tabla-reportes">
          <thead>
            <tr>
              <th>FOLIO</th>
              <th>FECHA TURNADO</th>
              <th>PROBLEMÁTICA REPORTADA</th>
              <th>UBICACIÓN</th>
              <th>ESTADO ACTUAL</th>
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
              <td class="font-bold" style="color: #1a6b2f">
                #{{ reporte.folio.split('-')[4] || reporte.folio }}
              </td>
              <td class="font-mono">{{ formatearFecha(reporte.detalle_reporte?.updated_at) }}</td>
              <td>
                <div class="ciudadano-info">
                  <span>{{ reporte.problemas_externos?.nombreamigable }}</span>
                  <small>{{ reporte.problemas_externos?.nombre }}</small>
                </div>
              </td>
              <td :title="reporte.domicilio">
                <div class="ciudadano-info">
                  <span>Col.{{ reporte.domicilio.split(',')[1] }}</span>
                  <small>{{ reporte.domicilio.split(',')[0] }}</small>
                </div>
              </td>
              <td class="text-center">
                <span
                  :class="[
                    'badge',
                    obtenerClaseEstado(
                      reporte.detalle_reporte?.estadoreporte?.estado.toLowerCase(),
                    ),
                  ]"
                >
                  {{ reporte.detalle_reporte?.estadoreporte?.estado }}
                </span>
              </td>

              <td class="acciones-celda">
                <button class="btn-accion" title="Ver detalle" @click="abrirModalVer(reporte)">
                  👁️
                </button>

                <button
                  v-if="reporte.detalle_reporte?.estadoreporte?.estado === 'Pendiente'"
                  class="btn-accion"
                  title="Rechazar reporte"
                  :disabled="foliosProcesando.has(reporte.folio)"
                  @click="rechazarReporte(reporte.folio)"
                >
                  ❌
                </button>

                <button
                  v-if="reporte.detalle_reporte?.estadoreporte?.estado === 'Pendiente'"
                  class="btn-accion"
                  title="Finalizar reporte"
                  :disabled="foliosProcesando.has(reporte.folio)"
                  @click="devolverReporte(reporte.folio, 'Finalizado')"
                >
                  ✅
                </button>

                <button
                  v-if="
                    reporte.detalle_reporte?.estadoreporte?.estado === 'Rechazado' ||
                    reporte.detalle_reporte?.estadoreporte?.estado === 'Finalizado'
                  "
                  class="btn-accion"
                  title="Devolver a Pendiente"
                  :disabled="foliosProcesando.has(reporte.folio)"
                  @click="devolverReporte(reporte.folio, 'Pendiente')"
                >
                  🔄
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
      :esAdminEx="true"
      @close="cerrarModalVer"
      @rechazar="rechazarReporte"
      @devolver="devolverReporte"
      @finalizar="devolverReporte"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ReporteDetalleModal from '../components/ReporteDetalleModal.vue'
import Swal from 'sweetalert2'
import { obtenerClaseEstado } from '../logic/panelAdministrador'
import { redireccionarUsuario } from '../logic/redirectUser.ts'
import { formatearFecha } from '@/logic/reporteDetalleModal.ts'
import { selectEq, selectEqOrder, updateEq } from '../services/supabaseController'

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
  estado: 'Pendiente',
})

import { useCargando } from '../composable/useCargando'
const { mostrarCargando, ocultarCargando } = useCargando()

onMounted(async () => {
  mostrarCargando() // Mostrar el indicador de carga al iniciar
  const sessionData = localStorage.getItem('adminSession')
  if (!sessionData) {
    router.push('/')
    return
  }

  admin.value = JSON.parse(sessionData)

  if (admin.value.tipo_id !== 6) {
    Swal.fire('Acceso Denegado', 'No tienes permisos para ver esta sección. Externo', 'error')
    redireccionarUsuario()
    return
  }

  await cargarCatalogos()
  await cargarReportes()
  ocultarCargando() // Ocultar el indicador de carga después de cargar los datos
})

const cargarCatalogos = async () => {
  // Traer solo problemas del departamento del admin
  const { data: problemasData, error: problemasError } = await selectEq(
    'problemas_externos',
    'departamento_externo_id',
    admin.value.departamento_id,
    ['id', 'nombre', 'nombreamigable', 'departamento_externo_id'],
  )

  if (problemasError) {
    console.error('Error al cargar problemas:', problemasError.message)
  } else {
    problemasOpciones.value = problemasData || []
  }

  // Traer nombre del departamento para mostrarlo en el header
  const { data: deptData, error: deptError } = await selectEq(
    'departamentos_externos',
    'id',
    admin.value.departamento_id,
    ['id', 'departamento'],
  )

  if (deptError) {
    console.error('Error al cargar departamento:', deptError.message)
  } else if (deptData && deptData.length > 0) {
    admin.value.departamento = deptData[0]?.departamento
  }
}

const cargarReportes = async () => {
  cargando.value = true
  const { data, error } = await selectEqOrder(
    'reportes',
    'departamento_externo_id',
    admin.value.departamento_id,
    'created_at',
    [
      'folio',
      'descripcion',
      'nombre',
      'telefono',
      'domicilio',
      'referencias',
      'foto_url',
      'created_at',
      'problemas_externos (id, nombre, nombreamigable)',
      'detalle_reporte (estado_id, estadoreporte (estado), updated_at)',
    ],
    false, // 👈 ascendente = true, descendente = false
  )

  if (!error && data) {
    reportes.value = data.map((r) => ({
      ...r,
      estado: r.detalle_reporte?.estadoreporte?.estado || 'Pendiente',
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
      r.problemas_externos.nombre.toLowerCase().includes(q) ||
      r.problemas_externos.nombreamigable.toLowerCase().includes(q) ||
      r.descripcion.toLowerCase().includes(q) ||
      r.domicilio.toLowerCase().includes(q) ||
      formatearFecha(r.detalle_reporte?.updated_at).includes(q)

    const coincideEstado = filtros.value.estado === '' || r.estado === filtros.value.estado
    return coincideBusqueda && coincideEstado
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
      const { error } = await updateEq(
        'detalle_reporte', // tabla
        'folio', // campo para eq
        folio, // valor a comparar
        { estado_id: 3 }, // data a actualizar
      )

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
  } finally {
    foliosProcesando.value.delete(folio)
    await cargarReportes()
    cerrarModalVer()
  }
}

const devolverReporte = async (folio: string, nuevoEstado: 'Finalizado' | 'Pendiente') => {
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
      const { error } = await updateEq('detalle_reporte', 'folio', folio, {
        estado_id: nuevoEstado == 'Finalizado' ? 4 : 1,
      })

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
  } finally {
    foliosProcesando.value.delete(folio)
    await cargarReportes()
    cerrarModalVer()
  }
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
  cerrarSesion,
  foliosProcesando,
})
</script>

<style src="../assets/panelAdministrador.css" />
