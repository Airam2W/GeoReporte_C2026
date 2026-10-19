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
      <div class="topbar-user" v-if="supervisor">
        <div class="user-info">
          <span class="user-name">{{ supervisor.nombre }}</span>
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
      <header class="content-header" v-if="supervisor">
        <div class="one-line-header">
          <h2>Reportes Asignados del Departamento</h2>
          <!-- Cambiar por nombre del departamento -->
          <p>{{ supervisor.departamento }}</p>
          <button class="btn-primario btn-large fix-right" @click="irACrearReporte">
            Crear Reporte
          </button>
        </div>
      </header>

      <!-- Botones de estado -->
      <section class="estados-grid" aria-label="Filtrar reportes por estado">
        <button
          v-for="e in estados"
          :key="e.valor"
          type="button"
          :class="['estado-btn', e.clase, { activo: filtros.estado === e.valor }]"
          :aria-pressed="filtros.estado === e.valor"
          @click="filtros.estado = e.valor"
        >
          <span class="estado-nombre">{{ e.valor }}</span>
          <span class="estado-conteo">{{ conteoPorEstado[e.valor] || 0 }}</span>
        </button>
      </section>

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
            placeholder="Buscar por folio o dirección..."
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
          <select v-model="filtros.jefe">
            <option value="">Todos los jefes</option>
            <option value="SIN_ASIGNAR">SIN ASIGNAR</option>
            <option v-for="jefe in jefesOpciones" :key="jefe.id" :value="jefe.id">
              {{ jefe.nombre }}
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
              <th>JEFE ASIGNADO</th>
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
              <td>{{ reporte.jefe }}</td>
              <td class="acciones-celda">
                <button
                  class="btn-accion btn-pdf"
                  title="Descargar PDF"
                  @click="descargarPDF(reporte)"
                >
                  📄
                </button>

                <button
                  class="btn-accion btn-ver"
                  title="Ver detalle"
                  @click="abrirModalVer(reporte)"
                >
                  👁️
                </button>

                <button
                  v-if="reporte.estado === 'Pendiente de Asignación'"
                  class="btn-accion btn-asignar"
                  title="Asignar jefe"
                  @click="asignarReporte(reporte.folio)"
                >
                  👤
                </button>

                <button
                  v-if="reporte.estado === 'Pendiente de Asignación'"
                  class="btn-accion btn-devolver"
                  title="Devolver Reporte"
                  @click="abrirModalDevolucion(reporte.folio)"
                >
                  ↩️
                </button>

                <button
                  v-if="reporte.estado === 'Pendiente de Finalización'"
                  class="btn-accion btn-finalizar"
                  title="Finalizar Reporte"
                  @click="abrirModalFinalizar(reporte)"
                >
                  ✅
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
      :esSupervisor="true"
      @close="cerrarModalVer"
      @asignarJefe="asignarReporte"
      @rechazar="rechazarReporte"
      @devolverRep="abrirModalDevolucion"
      @descargar-pdf="descargarPDF"
      @finalizarSupervisor="abrirModalFinalizar"
    />

    <DevolucionReporteModal
      :visible="modalDevolucionVisible"
      :folio="folioADevolver"
      :titulos="titulosDevolucion"
      :guardando="guardandoDevolucion"
      @close="cerrarModalDevolucion"
      @confirm="confirmarDevolucion"
    />

    <AsignarJefeModal
      :visible="modalAsignarJefeVisible"
      :folio="folioAAsignar"
      :problema="problemaAAsignar"
      :jefes="jefesActivos"
      :guardando="guardandoAsignacion"
      @close="cerrarModalAsignarJefe"
      @confirm="confirmarAsignacionJefe"
    />

    <FinalizarReporteModal
      :visible="modalFinalizarVisible"
      :folio="folioAFinalizar"
      :categoria-nombre="categoriaFinalizacion"
      :notas-iniciales="notasFinalizar"
      :foto-url="fotoFinalizar"
      :guardando="guardandoFinalizar"
      @close="cerrarModalFinalizar"
      @aceptar="(n: string) => resolverFinalizacion('aceptar', n)"
      @denegar="(n: string) => resolverFinalizacion('denegar', n)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { selectEq, selectEqOrder, updateEq, selectEqSingle } from '../services/supabaseController'
import ReporteDetalleModal from '../components/ReporteDetalleModal.vue'
import Swal from 'sweetalert2'
import { truncarTexto } from '../logic/panelAdministrador'
import { redireccionarUsuario } from '../logic/redirectUser'
import { generarPdfReporte } from '../logic/reportePdf'
import AsignarJefeModal from '../components/AsignarJefeModal.vue'
import FinalizarReporteModal from '../components/FinalizarReporteModal.vue'

const modalFinalizarVisible = ref(false)
const folioAFinalizar = ref('')
const jefeAFinalizar = ref('')
const notasFinalizar = ref('')
const fotoFinalizar = ref('')
const categoriaFinalizacion = ref('')
const guardandoFinalizar = ref(false)

const modalAsignarJefeVisible = ref(false)
const folioAAsignar = ref('')
const problemaAAsignar = ref('')
const guardandoAsignacion = ref(false)

const router = useRouter()
const supervisor = ref<any>(null)
const cargando = ref(true)
const reportes = ref<any[]>([])
const problemasOpciones = ref<any[]>([])
const foliosProcesando = ref(new Set<string>())
const jefesOpciones = ref<any[]>([])

// Estado del Modal de Ver Reporte
const modalVisible = ref(false)
const reporteActivo = ref<any>(null)

import DevolucionReporteModal from '../components/DevolucionReporteModal.vue'
import { insert } from '../services/supabaseController'

const titulosDevolucion = ref<any[]>([])
const modalDevolucionVisible = ref(false)
const folioADevolver = ref('')
const guardandoDevolucion = ref(false)

const filtros = ref({
  busqueda: '',
  fecha: '',
  problema: '',
  estado: 'Pendiente de Asignación',
  jefe: '',
})

const estados = [
  { valor: 'Pendiente de Asignación', clase: 'estado-azul' },
  { valor: 'Asignado', clase: 'estado-amarillo' },
  { valor: 'Pendiente de Finalización', clase: 'estado-verde' },
]

const conteoPorEstado = computed(() => {
  const conteo: Record<string, number> = {}
  for (const r of reportes.value) {
    conteo[r.estado] = (conteo[r.estado] || 0) + 1
  }
  return conteo
})

import { useCargando } from '../composable/useCargando'
const { mostrarCargando, ocultarCargando } = useCargando()

onMounted(async () => {
  mostrarCargando() // Mostrar el indicador de carga al iniciar
  const sessionData = localStorage.getItem('userSession')
  if (!sessionData) {
    router.push('/')
    return
  }
  supervisor.value = JSON.parse(sessionData)

  if (supervisor.value.tipo_id !== 3) {
    Swal.fire('Acceso Denegado', 'No tienes permisos para ver esta sección.', 'error')
    redireccionarUsuario()
    return
  }

  await cargarCatalogos()
  await cargarReportes()

  ocultarCargando() // Ocultar el indicador de carga después de cargar los datos
})

const descargarPDF = async (reporte: any) => {
  mostrarCargando()
  try {
    await generarPdfReporte(reporte, {
      departamento: supervisor.value?.departamento,
      supervisor: supervisor.value?.nombre,
    })
  } catch (error) {
    console.error('Error al generar el PDF:', error)
    Swal.fire('Error', 'No se pudo generar el PDF del reporte.', 'error')
  } finally {
    ocultarCargando()
  }
}

const cargarCatalogos = async () => {
  // Traer solo problemas del departamento del supervisor
  const { data: problemasData, error: problemasError } = await selectEq(
    'problemas',
    'departamento_id',
    supervisor.value.departamento_id,
    ['id', 'nombre', 'departamento_id'],
  )

  if (problemasError) {
    console.error('Error al cargar problemas:', problemasError.message)
  } else {
    problemasOpciones.value = problemasData || []
  }

  // Traer nombre del departamento para mostrarlo en el header
  const { data: deptData, error: deptError } = await selectEq(
    'departamentos',
    'id',
    supervisor.value.departamento_id,
    ['id', 'nombre'],
  )

  if (deptError) {
    console.error('Error al cargar departamento:', deptError.message)
  } else if (deptData && deptData.length > 0) {
    supervisor.value.departamento = deptData[0].nombre
  }

  // Traer los jefes que están bajo este supervisor (mismo departamento)
  const { data: jefesData, error: jefesError } = await selectEq(
    'jefes',
    'supervisor_id',
    supervisor.value.id_supervisor,
    ['id', 'usuario_id', 'usuarios(nombre,apellido_p,apellido_m,estadoadministrativo)'],
  )

  if (jefesError) {
    console.error('Error al cargar jefes:', jefesError.message)
  } else {
    jefesOpciones.value = (jefesData || []).map((j: any) => ({
      id: j.id,
      estado: j.usuarios?.estadoadministrativo,
      nombre:
        `${j.usuarios?.nombre || ''} ${j.usuarios?.apellido_p || ''} ${j.usuarios?.apellido_m || ''}`.trim(),
    }))
  }

  const { data: titulosData, error: titulosError } = await selectEq(
    'titulo',
    'categoria_historial_id',
    1, // 1 = Devolución
    ['id', 'nombre'],
  )

  if (titulosError) {
    console.error('Error al cargar títulos de devolución:', titulosError.message)
  } else {
    titulosDevolucion.value = titulosData || []
  }

  const { data: catData, error: catError } = await selectEq('categoria_historial', 'id', 3, [
    'id',
    'nombre',
  ])
  if (catError) console.error('Error al cargar categoría:', catError.message)
  else categoriaFinalizacion.value = catData?.[0]?.nombre || ''
}

const cargarReportes = async () => {
  cargando.value = true
  const { data, error } = await selectEqOrder(
    'reportes',
    'departamento_id',
    supervisor.value.departamento_id,
    'created_at',
    [
      'folio',
      'descripcion',
      'domicilio',
      'referencias',
      'foto_url',
      'created_at',
      'problemas(id,nombre)',
      'detalle_reporte(estado_id,fecha_inicio,fecha_cierre,estadoreporte(estado),jefe_id,supervisor_id,supervisores(usuario_id,usuarios(nombre,apellido_p,apellido_m)), jefes(usuario_id,usuarios(nombre,apellido_p,apellido_m)))',
      'historial_reporte(categoria_historial_id,notas,fecha,foto_url,titulo(nombre))',
    ],
    false, // false = descendente
  )

  if (!error && data) {
    const reportesMapeados = data
      .filter((r: any) => r.detalle_reporte?.supervisor_id === supervisor.value.id_supervisor)
      .map((r: any) => {
        const jefeUsuario = r.detalle_reporte?.jefes?.usuarios
        const estadoId = r.detalle_reporte?.estado_id
        const s = r.detalle_reporte?.supervisores?.usuarios
        const historial = Array.isArray(r.historial_reporte)
          ? r.historial_reporte
          : r.historial_reporte
            ? [r.historial_reporte]
            : []

        let estado = ''
        if (estadoId === 2) estado = 'Pendiente de Asignación'
        else if (estadoId === 8) estado = 'Pendiente de Finalización'
        else if (estadoId === 7) estado = 'Asignado'

        return {
          ...r,
          jefe: jefeUsuario
            ? `${jefeUsuario.nombre} ${jefeUsuario.apellido_p} ${jefeUsuario.apellido_m || ''}`.trim()
            : 'SIN ASIGNAR',
          estado,
          supervisor: s
            ? `${s.nombre} ${s.apellido_p} ${s.apellido_m || ''}`.trim()
            : 'SIN ASIGNAR',
          fecha_inicio: r.detalle_reporte?.fecha_inicio || null,
          fecha_cierre: r.detalle_reporte?.fecha_cierre || null,
          notas_avances: notasPorCategoria(historial, 4),
          notas_finalizacion: notasPorCategoria(historial, 3),
          notas_finales_finalizacion: notasPorCategoria(historial, 5),
          notas_denegacion: notasPorCategoria(historial, 6),
        }
      })

    reportes.value = reportesMapeados
  } else if (error) {
    console.error('Error al cargar reportes:', error.message)
    Swal.fire('Error', 'No se pudieron cargar los reportes.', 'error')
  }
  cargando.value = false
}

const formatearNota = (h: any) => {
  const fecha = new Date(h.fecha)
  return {
    fecha: fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
    hora: fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    titulo: h.titulo?.nombre || 'Sin título',
    notas: h.notas,
    foto_url: h.foto_url || '',
  }
}

const notasPorCategoria = (historial: any[], categoria: number) =>
  historial
    .filter((h) => h.categoria_historial_id === categoria)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .map(formatearNota)

const jefesActivos = computed(() => jefesOpciones.value.filter((j) => j.estado === 'Alta'))

// Filtros en tiempo real
const reportesFiltrados = computed(() => {
  return reportes.value.filter((r) => {
    const q = filtros.value.busqueda.toLowerCase()
    const coincideBusqueda =
      r.folio.toLowerCase().includes(q) || r.domicilio.toLowerCase().includes(q)

    const coincideProblema =
      filtros.value.problema === '' || r.problemas?.id == filtros.value.problema

    const coincideEstado = filtros.value.estado === '' || r.estado === filtros.value.estado

    const coincideJefe =
      filtros.value.jefe === '' ||
      (filtros.value.jefe === 'SIN_ASIGNAR'
        ? !r.detalle_reporte?.jefe_id
        : r.detalle_reporte?.jefe_id == filtros.value.jefe)

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

    return coincideBusqueda && coincideProblema && coincideEstado && coincideJefe && coincideFecha
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
      customClass: { container: 'swal-difuminado' },
    })

    if (result.isConfirmed) {
      const { error } = await updateEq(
        'detalle_reporte', // tabla
        'folio', // campo para eq
        folio, // valor a comparar
        { estado_id: 3 }, // data a actualizar
      )

      if (!error) {
        //const index = reportes.value.findIndex((r) => r.folio === folio)
        //if (index !== -1) reportes.value[index].estado = 'Rechazado'
        await cargarReportes()
        cerrarModalVer()

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
  }
}

// Paso 1: abre el modal con las notas y la foto que envió el jefe
const abrirModalFinalizar = (reporte: any) => {
  const ultima = reporte.notas_finalizacion?.[0] // la más reciente
  folioAFinalizar.value = reporte.folio
  jefeAFinalizar.value = reporte.jefe
  notasFinalizar.value = ultima?.notas || ''
  fotoFinalizar.value = ultima?.foto_url || ''
  modalFinalizarVisible.value = true
}

const cerrarModalFinalizar = () => {
  modalFinalizarVisible.value = false
}

// Paso 2: aceptar o denegar
const resolverFinalizacion = async (decision: 'aceptar' | 'denegar', notas: string) => {
  const folio = folioAFinalizar.value
  if (foliosProcesando.value.has(folio)) return
  const acepta = decision === 'aceptar'

  const result = await Swal.fire({
    title: acepta ? '¿Aceptar finalización?' : '¿Denegar finalización?',
    html: acepta
      ? `Aceptarás la finalización del reporte <b>${folio}</b> hecha por el jefe <b>${jefeAFinalizar.value}</b>.`
      : `Denegarás la finalización del reporte <b>${folio}</b> hecha por el jefe <b>${jefeAFinalizar.value}</b>. El reporte regresará a "Asignado".`,
    icon: acepta ? 'question' : 'warning',
    showCancelButton: true,
    confirmButtonColor: acepta ? '#1a6b2f' : '#d33',
    cancelButtonColor: '#888',
    confirmButtonText: acepta ? 'Sí, aceptar' : 'Sí, denegar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    customClass: { container: 'swal-difuminado' },
  })
  if (!result.isConfirmed) return

  foliosProcesando.value.add(folio)
  guardandoFinalizar.value = true

  try {
    // 1. Historial: 5/9 = aceptación, 6/10 = denegación
    const { error: errorHistorial } = await insert('historial_reporte', {
      folio,
      categoria_historial_id: acepta ? 5 : 6,
      titulo_id: acepta ? 9 : 10,
      notas,
      foto_url: fotoFinalizar.value || null,
    })
    if (errorHistorial) {
      console.error('Error al guardar historial:', errorHistorial)
      Swal.fire('Error', 'No se pudo registrar la decisión en el historial.', 'error')
      return
    }

    // 2. Estado: 4 = Finalizado (con fecha de cierre), 7 = En Proceso
    const cambios = acepta
      ? { estado_id: 4, fecha_cierre: new Date().toISOString() }
      : { estado_id: 7 }

    const { error: errorDetalle } = await updateEq('detalle_reporte', 'folio', folio, cambios)
    if (errorDetalle) {
      console.error('Error al actualizar detalle_reporte:', errorDetalle)
      Swal.fire(
        'Error',
        'La decisión se registró en el historial, pero no se pudo actualizar el estado del reporte.',
        'error',
      )
      return
    }

    cerrarModalFinalizar()
    await cargarReportes()

    Swal.fire({
      title: acepta ? '¡Reporte finalizado!' : 'Finalización denegada',
      text: acepta ? 'El reporte quedó como finalizado.' : 'El reporte regresó a "Asignado".',
      icon: 'success',
      confirmButtonColor: '#1a6b2f',
      customClass: { container: 'swal-difuminado' },
    })
  } finally {
    foliosProcesando.value.delete(folio)
    guardandoFinalizar.value = false
  }
}

const buscarEstadoId = async (estado: string): Promise<string | null> => {
  try {
    const { data, error } = await selectEqSingle(
      'estadoreporte',
      'estado',
      estado,
      ['id'], // 👈 columnas específicas
    )

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

// Paso 1: solo abre el modal con el formulario
const abrirModalDevolucion = (folio: string) => {
  cerrarModalVer() // cierra el modal de detalle si estaba abierto
  folioADevolver.value = folio
  modalDevolucionVisible.value = true
}

const cerrarModalDevolucion = () => {
  modalDevolucionVisible.value = false
}

// Paso 2: confirmación + guardado en BD
const confirmarDevolucion = async (formData: { titulo_id: number | string; notas: string }) => {
  const folio = folioADevolver.value
  if (foliosProcesando.value.has(folio)) return

  const result = await Swal.fire({
    title: '¿Devolver este reporte?',
    text: `El folio ${folio} será marcado como "Devuelto" y dejará de estar asignado a ti.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#1a6b2f',
    cancelButtonColor: '#888',
    confirmButtonText: 'Sí, devolver',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    customClass: { container: 'swal-difuminado' },
  })

  if (!result.isConfirmed) return

  foliosProcesando.value.add(folio)
  guardandoDevolucion.value = true

  try {
    const estadoId = await buscarEstadoId('Devuelto')
    if (!estadoId) {
      Swal.fire('Error', 'No se pudo encontrar el ID del estado "Devuelto".', 'error')
      return
    }

    // 1. Registrar en el historial
    const { error: errorHistorial } = await insert('historial_reporte', {
      folio,
      categoria_historial_id: 1,
      titulo_id: formData.titulo_id,
      notas: formData.notas,
    })

    if (errorHistorial) {
      console.error('Error al guardar historial:', errorHistorial)
      Swal.fire('Error', 'No se pudo registrar la devolución en el historial.', 'error')
      return
    }

    // 2. Cambiar estado y liberar al supervisor (en una sola actualización)
    const { error: errorDetalle } = await updateEq('detalle_reporte', 'folio', folio, {
      estado_id: estadoId,
      supervisor_id: null,
    })

    if (errorDetalle) {
      console.error('Error al actualizar detalle_reporte:', errorDetalle)
      Swal.fire(
        'Error',
        'La devolución se registró en el historial, pero no se pudo actualizar el estado del reporte.',
        'error',
      )
      return
    }

    cerrarModalDevolucion()
    await cargarReportes()

    Swal.fire({
      title: '¡Devuelto!',
      text: 'El reporte ha sido devuelto correctamente.',
      icon: 'success',
      confirmButtonColor: '#1a6b2f',
      customClass: { container: 'swal-difuminado' },
    })
  } finally {
    foliosProcesando.value.delete(folio)
    guardandoDevolucion.value = false
  }
}
// Paso 1: solo abre el modal
const asignarReporte = (folio: string) => {
  if (!folio) return
  const reporte = reportes.value.find((r) => r.folio === folio)
  cerrarModalVer() // por si se llamó desde el modal de detalle
  folioAAsignar.value = folio
  problemaAAsignar.value = reporte?.problemas?.nombre || ''
  modalAsignarJefeVisible.value = true
}

const cerrarModalAsignarJefe = () => {
  modalAsignarJefeVisible.value = false
}

// Paso 2: confirmación + guardado
const confirmarAsignacionJefe = async (datos: { jefe_id: number | string; jefeNombre: string }) => {
  const folio = folioAAsignar.value
  if (foliosProcesando.value.has(folio)) return

  const result = await Swal.fire({
    title: '¿Asignar reporte?',
    html: `El reporte <b>${folio}</b> se asignará al jefe <b>${datos.jefeNombre}</b>.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#1a6b2f',
    cancelButtonColor: '#888',
    confirmButtonText: 'Sí, asignar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    customClass: { container: 'swal-difuminado' },
  })

  if (!result.isConfirmed) return

  foliosProcesando.value.add(folio)
  guardandoAsignacion.value = true

  try {
    // Un solo update: jefe, estado En Proceso (7) y fecha de inicio
    const { error } = await updateEq('detalle_reporte', 'folio', folio, {
      jefe_id: datos.jefe_id,
      estado_id: 7, // 7 = En Proceso
      fecha_inicio: new Date().toISOString(),
    })

    if (error) {
      console.error('Error al asignar reporte:', error)
      Swal.fire({
        title: 'Error',
        text: 'No se pudo asignar el reporte.',
        icon: 'error',
        confirmButtonColor: '#1a6b2f',
        customClass: { container: 'swal-difuminado' },
      })
      return
    }

    cerrarModalAsignarJefe()
    await cargarReportes()

    Swal.fire({
      title: '¡Asignado!',
      text: `El reporte fue asignado a ${datos.jefeNombre}.`,
      icon: 'success',
      confirmButtonColor: '#1a6b2f',
      customClass: { container: 'swal-difuminado' },
    })
  } finally {
    foliosProcesando.value.delete(folio)
    guardandoAsignacion.value = false
  }
}

const irACrearReporte = () => {
  router.push('/reporte')
}

const cerrarSesion = () => {
  localStorage.removeItem('userSession')
  router.push('/')
}

defineExpose({
  supervisor,
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
  abrirModalDevolucion,
  cerrarModalDevolucion,
  confirmarDevolucion,
  asignarReporte,
  cerrarSesion,
})
</script>

<style src="../assets/estadosBotones.css"></style>
<style src="../assets/panelSupervisor.css"></style>
