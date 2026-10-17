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
        <div class="one-line-header">
          <h2>Reportes del Departamento</h2>
          <!-- Cambiar por nombre del departamento -->
          <p>{{ admin.departamento }}</p>
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
            placeholder="Buscar por folio, nombre, teléfono o dirección..."
          />
        </div>

        <div class="filtro-grupo">
          <input v-model="filtros.fecha" type="date" title="Filtrar por fecha" />
        </div>

        <template v-if="esEnProceso">
          <div class="filtro-grupo">
            <select v-model="filtros.supervisor">
              <option value="">Todos los supervisores</option>
              <option v-for="s in supervisoresTodos" :key="s.id" :value="s.id">
                {{ s.nombre }}
              </option>
            </select>
          </div>

          <div class="filtro-grupo">
            <select v-model="filtros.jefe" :disabled="!filtros.supervisor">
              <option value="">Todos los jefes</option>
              <option value="SIN_ASIGNAR">SIN ASIGNAR</option>
              <option v-for="j in jefesDelSupervisor" :key="j.id" :value="j.id">
                {{ j.nombre }}
              </option>
            </select>
          </div>
        </template>

        <div class="filtro-grupo">
          <select v-model="filtros.problema">
            <option value="">Todos los problemas</option>
            <option v-for="prob in problemasOpciones" :key="prob.id" :value="prob.id">
              {{ prob.nombre }}
            </option>
          </select>
        </div>

        <!--<div class="filtro-grupo">
          <select
            name="estado"
            id="estado"
            v-model="filtros.estado"
            :class="['badge', obtenerClaseEstado(filtros.estado.toLowerCase())]"
          >
            <option value="Pendiente" class="badge-azul" selected>Pendiente</option>
            <option value="En Revisión" class="badge-amarillo">En Revisión</option>
            <option value="Devuelto" class="badge-cafe">Devuelto</option>
            <option value="Turnado" class="badge-purpura">Turnado</option>
            <option value="Finalizado" class="badge-verde">Finalizado</option>
            <option value="Rechazado" class="badge-rojo">Rechazado</option>
          </select>
        </div>-->
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
              <th v-if="esEnProceso">SUPERVISOR ASIGNADO</th>
              <th v-if="esEnProceso">JEFE ASIGNADO</th>
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
              <td v-if="esEnProceso">{{ reporte.supervisor }}</td>
              <td v-if="esEnProceso">{{ reporte.jefe }}</td>
              <td class="acciones-celda">
                <button
                  class="btn-accion btn-ver"
                  title="Ver detalle"
                  @click="abrirModalVer(reporte)"
                >
                  👁️
                </button>

                <button
                  v-if="
                    reporte.estado === 'Pendiente' ||
                    reporte.estado === 'Turnado' ||
                    reporte.estado === 'Devuelto'
                  "
                  class="btn-accion btn-asignar"
                  title="Asignar supervisor"
                  @click="asignarReporte(reporte.folio)"
                >
                  👤
                </button>

                <button
                  v-if="reporte.estado === 'Devuelto'"
                  class="btn-accion btn-asignar"
                  title="Turnar reporte"
                  @click="turnarReporte(reporte.folio)"
                >
                  🔄
                </button>

                <button
                  v-if="
                    reporte.estado === 'Rechazado' ||
                    reporte.estado === 'Finalizado' ||
                    reporte.estado === 'Devuelto'
                  "
                  class="btn-accion btn-devolver"
                  title="Devolver a Pendiente"
                  @click="devolverReporte(reporte.folio, 'Pendiente')"
                >
                  ↩️
                </button>

                <button
                  v-if="reporte.estado === 'Pendiente' || reporte.estado === 'Devuelto'"
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
      @turnar="turnarReporte"
    />

    <TurnarReporteModal
      :visible="modalTurnarVisible"
      :folio="folioATurnar"
      :departamentos-internos="departamentosInternos"
      :departamentos-externos="departamentosExternos"
      :guardando="guardandoTurnado"
      @close="cerrarModalTurnar"
      @confirm="confirmarTurnado"
    />

    <AsignarReporteModal
      :visible="modalAsignarVisible"
      :folio="folioAAsignar"
      :departamento-nombre="admin?.departamento || ''"
      :supervisores="supervisoresOpciones"
      :guardando="guardandoAsignacion"
      @close="cerrarModalAsignar"
      @confirm="confirmarAsignacion"
    />

    <RechazarReporteModal
      :visible="modalRechazarVisible"
      :folio="folioARechazar"
      :titulos="titulosRechazo"
      :guardando="guardandoRechazo"
      @close="cerrarModalRechazar"
      @confirm="confirmarRechazo"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { selectEq, selectEqOrder, updateEq, selectEqSingle } from '../services/supabaseController'
import ReporteDetalleModal from '../components/ReporteDetalleModal.vue'
import Swal from 'sweetalert2'
import { truncarTexto, obtenerClaseEstado } from '../logic/panelAdministrador'
import { redireccionarUsuario } from '@/logic/redirectUser.ts'
import TurnarReporteModal from '../components/TurnarReporteModal.vue'
import { selectAll } from '../services/supabaseController'
import AsignarReporteModal from '../components/AsignarReporteModal.vue'
import RechazarReporteModal from '../components/RechazarReporteModal.vue'
import { insert } from '../services/supabaseController' // agrégalo al import existente

const titulosRechazo = ref<any[]>([])
const modalRechazarVisible = ref(false)
const folioARechazar = ref('')
const guardandoRechazo = ref(false)

const supervisoresOpciones = ref<any[]>([])
const modalAsignarVisible = ref(false)
const folioAAsignar = ref('')
const guardandoAsignacion = ref(false)

const departamentosInternos = ref<any[]>([])
const departamentosExternos = ref<any[]>([])
const modalTurnarVisible = ref(false)
const folioATurnar = ref('')
const guardandoTurnado = ref(false)

const router = useRouter()
const admin = ref<any>(null)
const cargando = ref(true)
const reportes = ref<any[]>([])
const problemasOpciones = ref<any[]>([])
const foliosProcesando = ref(new Set<string>())

const estados = [
  { valor: 'Pendiente', clase: 'estado-azul' },
  { valor: 'En Revisión', clase: 'estado-amarillo' },
  { valor: 'En Proceso', clase: 'estado-teal' },
  { valor: 'Devuelto', clase: 'estado-cafe' },
  { valor: 'Turnado', clase: 'estado-purpura' },
  { valor: 'Finalizado', clase: 'estado-verde' },
  { valor: 'Rechazado', clase: 'estado-rojo' },
]

// Cantidad de reportes por estado (se actualiza sola al recargar)
const conteoPorEstado = computed(() => {
  const conteo: Record<string, number> = {}
  for (const r of reportes.value) {
    conteo[r.estado] = (conteo[r.estado] || 0) + 1
  }
  return conteo
})

// Estado del Modal de Ver Reporte
const modalVisible = ref(false)
const reporteActivo = ref<any>(null)

const filtros = ref({
  busqueda: '',
  fecha: '',
  problema: '',
  estado: 'Pendiente',
  supervisor: '',
  jefe: '',
})

// Al cambiar de supervisor, el jefe elegido ya no aplica
watch(
  () => filtros.value.supervisor,
  () => {
    filtros.value.jefe = ''
  },
)

// Fuera de "En Proceso" estos filtros no se ven, así que se limpian
watch(
  () => filtros.value.estado,
  (e) => {
    if (e !== 'En Proceso') {
      filtros.value.supervisor = ''
      filtros.value.jefe = ''
    }
  },
)

const supervisoresTodos = ref<any[]>([])
const jefesTodos = ref<any[]>([])

const esEnProceso = computed(() => filtros.value.estado === 'En Proceso')
const columnasTabla = computed(() => (esEnProceso.value ? 7 : 5))

// Solo los jefes del supervisor elegido
const jefesDelSupervisor = computed(() =>
  jefesTodos.value.filter((j) => j.supervisor_id == filtros.value.supervisor),
)

import { useCargando } from '../composable/useCargando'
const { mostrarCargando, ocultarCargando } = useCargando()

onMounted(async () => {
  mostrarCargando() // Mostrar el indicador de carga al iniciar
  const sessionData = localStorage.getItem('userSession')
  if (!sessionData) {
    router.push('/')
    return
  }
  admin.value = JSON.parse(sessionData)

  if (admin.value.tipo_id !== 2) {
    Swal.fire('Acceso Denegado', 'No tienes permisos para ver esta sección.', 'error')
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
    'problemas',
    'departamento_id',
    admin.value.departamento_id,
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
    admin.value.departamento_id,
    ['id', 'nombre'],
  )

  if (deptError) {
    console.error('Error al cargar departamento:', deptError.message)
  } else if (deptData && deptData.length > 0) {
    admin.value.departamento = deptData[0].nombre
  }

  const { data: internos } = await selectAll('departamentos', ['id', 'nombre', 'estado'])
  const { data: externos } = await selectAll('departamentos_externos', [
    'id',
    'departamento',
    'estado',
  ])

  // El departamento actual no tiene sentido como destino del turnado
  departamentosInternos.value = (internos || []).filter(
    (d: any) => d.id !== admin.value.departamento_id,
  )
  departamentosExternos.value = externos || []

  const { data: supData, error: supError } = await selectEq(
    'supervisores',
    'departamento_id',
    admin.value.departamento_id,
    ['id', 'usuario_id', 'usuarios(nombre,apellido_p,apellido_m,estadoadministrativo)'],
  )

  if (supError) {
    console.error('Error al cargar supervisores:', supError.message)
  } else {
    supervisoresTodos.value = (supData || []).map((s: any) => ({
      id: s.id,
      estado: s.usuarios?.estadoadministrativo,
      nombre:
        `${s.usuarios?.nombre || ''} ${s.usuarios?.apellido_p || ''} ${s.usuarios?.apellido_m || ''}`.trim(),
    }))

    supervisoresOpciones.value = supervisoresTodos.value.filter((s) => s.estado === 'Alta')

    // Jefes que dependen de los supervisores de este departamento
    const idsSupervisores = supervisoresTodos.value.map((s) => s.id)
    const { data: jefesData, error: jefesError } = await selectAll('jefes', [
      'id',
      'supervisor_id',
      'usuarios(nombre,apellido_p,apellido_m)',
    ])

    if (jefesError) {
      console.error('Error al cargar jefes:', jefesError.message)
    } else {
      jefesTodos.value = (jefesData || [])
        .filter((j: any) => idsSupervisores.includes(j.supervisor_id))
        .map((j: any) => ({
          id: j.id,
          supervisor_id: j.supervisor_id,
          nombre:
            `${j.usuarios?.nombre || ''} ${j.usuarios?.apellido_p || ''} ${j.usuarios?.apellido_m || ''}`.trim(),
        }))
    }
  }

  const { data: titulosData, error: titulosError } = await selectEq(
    'titulo',
    'categoria_historial_id',
    2, // 2 = Rechazo
    ['id', 'nombre'],
  )

  if (titulosError) {
    console.error('Error al cargar títulos de rechazo:', titulosError.message)
  } else {
    titulosRechazo.value = titulosData || []
  }
}

// Paso 1: solo abre el modal
const turnarReporte = (folio: string | undefined) => {
  if (!folio) return
  cerrarModalVer() // por si se llamó desde el modal de detalle
  folioATurnar.value = folio
  modalTurnarVisible.value = true
}

const cerrarModalTurnar = () => {
  modalTurnarVisible.value = false
}

// Paso 2: confirmación + guardado
const confirmarTurnado = async (datos: any) => {
  const folio = folioATurnar.value
  if (foliosProcesando.value.has(folio)) return

  const result = await Swal.fire({
    title: '¿Turnar reporte?',
    html: `El folio <b>${folio}</b> será turnado al administrador <b>${datos.administradorNombre}</b> del departamento <b>${datos.departamentoNombre}</b> (${datos.tipo.toLowerCase()}).`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#1a6b2f',
    cancelButtonColor: '#888',
    confirmButtonText: 'Sí, turnar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    customClass: { container: 'swal-difuminado' },
  })

  if (!result.isConfirmed) return

  foliosProcesando.value.add(folio)
  guardandoTurnado.value = true

  try {
    const cambios =
      datos.tipo === 'Interno'
        ? {
            departamento_id: datos.departamento_id,
            problema_id: datos.problema_id,
          }
        : {
            departamento_id: null,
            problema_id: null,
            departamento_externo_id: datos.departamento_id,
            problema_externo_id: datos.problema_id,
          }

    // 1. Cambiar departamento/problema en "reportes"
    const { error } = await updateEq('reportes', 'folio', folio, cambios)

    if (error) {
      console.error('Error al turnar reporte:', error)
      Swal.fire('Error', 'No se pudo turnar el reporte.', 'error')
      return
    }

    // 2. Marcar el estado como Turnado (5) en "detalle_reporte"
    const { error: errorEstado } = await updateEq('detalle_reporte', 'folio', folio, {
      estado_id: 5, // 5 = Turnado
    })

    if (errorEstado) {
      console.error('Error al actualizar el estado a Turnado:', errorEstado)
      Swal.fire(
        'Error',
        'El reporte se turnó, pero no se pudo actualizar su estado a "Turnado".',
        'error',
      )
      return
    }

    cerrarModalTurnar()
    await cargarReportes()

    Swal.fire({
      title: '¡Turnado!',
      text: `El reporte fue turnado a ${datos.departamentoNombre}.`,
      icon: 'success',
      confirmButtonColor: '#1a6b2f',
      customClass: { container: 'swal-difuminado' },
    })
  } finally {
    foliosProcesando.value.delete(folio)
    guardandoTurnado.value = false
  }
}

const cargarReportes = async () => {
  cargando.value = true
  const { data, error } = await selectEqOrder(
    'reportes',
    'departamento_id',
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
      'problemas (id, nombre)',
      'historial_reporte (categoria_historial_id, notas, fecha, titulo(nombre))',
      'detalle_reporte (estado_id, estadoreporte (estado), supervisor_id, jefe_id, supervisores (usuarios (nombre, apellido_p, apellido_m)), jefes (usuarios (nombre, apellido_p, apellido_m)))',
    ],
    false,
  )

  if (error) console.error('Error al cargar reportes:', error.message)

  if (!error && data) {
    reportes.value = data.map((r: any) => {
      // Puede venir como arreglo o como objeto único, según cómo esté definida la relación
      const historial = Array.isArray(r.historial_reporte)
        ? r.historial_reporte
        : r.historial_reporte
          ? [r.historial_reporte]
          : []

      const nombreDe = (u: any) =>
        u ? `${u.nombre || ''} ${u.apellido_p || ''} ${u.apellido_m || ''}`.trim() : 'SIN ASIGNAR'

      return {
        ...r,
        estado: [7, 8].includes(r.detalle_reporte?.estado_id)
          ? 'En Proceso'
          : r.detalle_reporte?.estadoreporte?.estado || 'Pendiente',
        supervisor: nombreDe(r.detalle_reporte?.supervisores?.usuarios),
        jefe: nombreDe(r.detalle_reporte?.jefes?.usuarios),
        notas_rechazo: notasPorCategoria(historial, 2),
        notas_devuelto: notasPorCategoria(historial, 1),
      }
    })
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
  }
}

const notasPorCategoria = (historial: any[], categoria: number) =>
  historial
    .filter((h) => h.categoria_historial_id === categoria && h.notas)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .map(formatearNota)

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

    const coincideSupervisor =
      filtros.value.supervisor === '' ||
      r.detalle_reporte?.supervisor_id == filtros.value.supervisor

    const coincideJefe =
      filtros.value.jefe === '' ||
      (filtros.value.jefe === 'SIN_ASIGNAR'
        ? !r.detalle_reporte?.jefe_id
        : r.detalle_reporte?.jefe_id == filtros.value.jefe)

    return (
      coincideBusqueda &&
      coincideProblema &&
      coincideEstado &&
      coincideFecha &&
      coincideSupervisor &&
      coincideJefe
    )
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

// Paso 1: solo abre el modal
const rechazarReporte = (folio: string | undefined) => {
  if (!folio) return
  cerrarModalVer() // por si se llamó desde el modal de detalle
  folioARechazar.value = folio
  modalRechazarVisible.value = true
}

const cerrarModalRechazar = () => {
  modalRechazarVisible.value = false
}

// Paso 2: confirmación + guardado
const confirmarRechazo = async (datos: {
  titulo_id: number | string
  notas: string
  tituloNombre: string
}) => {
  const folio = folioARechazar.value
  if (foliosProcesando.value.has(folio)) return

  const result = await Swal.fire({
    title: '¿Rechazar reporte?',
    html: `Se rechazará el reporte <b>${folio}</b> por el motivo <b>${datos.tituloNombre}</b>. Esta acción lo marcará como "Rechazado".`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#888',
    confirmButtonText: 'Sí, rechazar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    customClass: { container: 'swal-difuminado' },
  })

  if (!result.isConfirmed) return

  foliosProcesando.value.add(folio)
  guardandoRechazo.value = true

  try {
    // 1. Registrar en el historial
    const { error: errorHistorial } = await insert('historial_reporte', {
      folio,
      categoria_historial_id: 2, // 2 = Rechazo
      titulo_id: datos.titulo_id,
      notas: datos.notas,
    })

    if (errorHistorial) {
      console.error('Error al guardar historial:', errorHistorial)
      Swal.fire('Error', 'No se pudo registrar el rechazo en el historial.', 'error')
      return
    }

    // 2. Cambiar el estado a Rechazado (3)
    const { error: errorDetalle } = await updateEq('detalle_reporte', 'folio', folio, {
      estado_id: 3, // 3 = Rechazado
    })

    if (errorDetalle) {
      console.error('Error al actualizar detalle_reporte:', errorDetalle)
      Swal.fire(
        'Error',
        'El rechazo se registró en el historial, pero no se pudo actualizar el estado del reporte.',
        'error',
      )
      return
    }

    cerrarModalRechazar()
    await cargarReportes()

    Swal.fire({
      title: '¡Rechazado!',
      text: 'El reporte ha sido rechazado correctamente.',
      icon: 'success',
      confirmButtonColor: '#1a6b2f',
      customClass: { container: 'swal-difuminado' },
    })
  } finally {
    foliosProcesando.value.delete(folio)
    guardandoRechazo.value = false
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

const devolverReporte = async (folio: string, nuevoEstado: 'En Proceso' | 'Pendiente') => {
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
      customClass: { container: 'swal-difuminado' },
    })

    if (result.isConfirmed) {
      const estadoId = await buscarEstadoId(nuevoEstado)
      if (!estadoId) {
        Swal.fire({
          title: 'Error',
          text: 'No se encontró el estado en la base de datos.',
          icon: 'error',
          confirmButtonColor: '#1a6b2f',
          customClass: { container: 'swal-difuminado' },
        })
        return
      }

      const { data, error } = await updateEq(
        'detalle_reporte', // tabla
        'folio', // campo para eq
        folio, // valor a comparar
        { estado_id: estadoId }, // data a actualizar
      )

      if (!error) {
        //const index = reportes.value.findIndex((r) => r.folio === folio)
        //if (index !== -1) reportes.value[index].estado = nuevoEstado
        await cargarReportes()
        cerrarModalVer()

        Swal.fire({
          title: '¡Actualizado!',
          text: `El reporte ahora está en "${nuevoEstado}".`,
          icon: 'success',
          confirmButtonColor: '#1a6b2f',
          customClass: { container: 'swal-difuminado' },
        })
      } else {
        Swal.fire({
          title: 'Error',
          text: 'Hubo un error al actualizar el estado en la base de datos.',
          icon: 'error',
          confirmButtonColor: '#1a6b2f',
          customClass: { container: 'swal-difuminado' },
        })
      }
    }
  } finally {
    foliosProcesando.value.delete(folio)
  }
}

// Paso 1: solo abre el modal
const asignarReporte = (folio: string | undefined) => {
  if (!folio) return
  cerrarModalVer() // por si se llamó desde el modal de detalle
  folioAAsignar.value = folio
  modalAsignarVisible.value = true
}

const cerrarModalAsignar = () => {
  modalAsignarVisible.value = false
}

// Paso 2: confirmación + guardado
const confirmarAsignacion = async (datos: {
  supervisor_id: number | string
  supervisorNombre: string
}) => {
  const folio = folioAAsignar.value
  if (foliosProcesando.value.has(folio)) return

  const result = await Swal.fire({
    title: '¿Asignar reporte?',
    html: `El folio <b>${folio}</b> será asignado al supervisor <b>${datos.supervisorNombre}</b>.`,
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
    // Un solo update: supervisor y estado 2 (En Revisión)
    const { error } = await updateEq('detalle_reporte', 'folio', folio, {
      supervisor_id: datos.supervisor_id,
      estado_id: 2, // 2 = En Revisión
    })

    if (error) {
      console.error('Error al asignar reporte:', error)
      Swal.fire('Error', 'No se pudo asignar el reporte.', 'error')
      return
    }

    cerrarModalAsignar()
    await cargarReportes()

    Swal.fire({
      title: '¡Asignado!',
      text: `El reporte fue asignado a ${datos.supervisorNombre}.`,
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
  //turnarReporte,
  cerrarSesion,
})
</script>

<style src="../assets/estadosBotones.css"></style>
<style src="../assets/panelAdministrador.css"></style>
