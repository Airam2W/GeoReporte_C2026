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
      <div class="topbar-user" v-if="jefe">
        <div class="user-info">
          <span class="user-name">{{ jefe.nombre }}</span>
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

    <main class="dashboard-content">
      <!-- Título y departamento -->
      <header class="content-header" v-if="jefe">
        <h2>Reportes Asignados</h2>
        <p>{{ jefe.departamento }}</p>
      </header>

      <!-- Botones de estado -->
      <section class="estados-grid estados-grid--dos" aria-label="Filtrar reportes por estado">
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

      <!-- Filtros -->
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
            placeholder="Buscar por folio o domicilio..."
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
      </section>

      <!-- Tabla (en móvil se convierte en tarjetas) -->
      <div class="tabla-contenedor">
        <table class="tabla-reportes tabla-jefe">
          <thead>
            <tr>
              <th>FOLIO</th>
              <th>PROBLEMA</th>
              <th>DOMICILIO</th>
              <th class="text-center">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando" class="fila-vacia">
              <td colspan="4">Cargando reportes...</td>
            </tr>
            <tr v-else-if="reportesFiltrados.length === 0" class="fila-vacia">
              <td colspan="4">No se encontraron reportes con estos filtros.</td>
            </tr>
            <tr v-else v-for="reporte in reportesFiltrados" :key="reporte.folio" class="fila-datos">
              <td class="font-mono" data-label="Folio">
                #{{ reporte.folio.split('-')[4] || reporte.folio }}
              </td>
              <td class="font-bold" data-label="Problema">{{ reporte.problemas?.nombre }}</td>
              <td data-label="Domicilio" :title="reporte.domicilio">
                <span class="domicilio-texto">{{ reporte.domicilio }}</span>
              </td>
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
                  v-if="reporte.detalle_reporte?.estado_id === 7"
                  class="btn-accion btn-avance"
                  title="Actualizar avance"
                  @click="actualizarAvance(reporte)"
                >
                  ⬆️
                </button>
                <button
                  v-if="reporte.detalle_reporte?.estado_id === 7"
                  class="btn-accion btn-finalizar"
                  title="Enviar petición de finalización"
                  @click="finalizarReporte(reporte)"
                >
                  ✅
                </button>

                <button
                  v-if="reporte.detalle_reporte?.estado_id === 8"
                  class="btn-accion btn-espera"
                  title="Esperando la confirmación del supervisor"
                  disabled
                >
                  ⏳
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
      :esJefe="true"
      @close="cerrarModalVer"
      @descargar-pdf="descargarPDF"
      @actualizarAvance="actualizarAvance"
      @enviarPeticionFinalizacion="finalizarReporte"
    />

    <EvidenciaReporteModal
      :visible="modalEvidenciaVisible"
      :folio="folioEvidencia"
      :encabezado="encabezadoModal"
      :titulos="titulosModal"
      :titulo-fijo="modoEvidencia === 'finalizar'"
      :guardando="guardandoEvidencia"
      @close="cerrarEvidencia"
      @confirm="confirmarEvidencia"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ReporteDetalleModal from '../components/ReporteDetalleModal.vue'
import Swal from 'sweetalert2'
import { redireccionarUsuario } from '../logic/redirectUser'
import { generarPdfReporte } from '../logic/reportePdf'
import { useCargando } from '../composable/useCargando'
import EvidenciaReporteModal from '../components/EvidenciaReporteModal.vue'
import {
  selectEq,
  selectEqOrder,
  updateEq,
  insert,
  uploadFoto,
  getPublicUrl,
} from '../services/supabaseController'

const modalEvidenciaVisible = ref(false)
const modoEvidencia = ref<'finalizar' | 'avance'>('avance')
const folioEvidencia = ref('')
const guardandoEvidencia = ref(false)
const tituloFinalizacion = ref<any[]>([]) // solo el primero de la categoría 3
const titulosAvance = ref<any[]>([]) // todos los de la categoría 4

const titulosModal = computed(() =>
  modoEvidencia.value === 'finalizar' ? tituloFinalizacion.value : titulosAvance.value,
)
const encabezadoModal = computed(() =>
  modoEvidencia.value === 'finalizar'
    ? 'Enviar Petición de Finalización'
    : 'Enviar Avance de Reporte',
)

const { mostrarCargando, ocultarCargando } = useCargando()
const router = useRouter()

const supervisor = ref<any>(null)
const jefe = ref<any>(null)
const cargando = ref(true)
const reportes = ref<any[]>([])
const problemasOpciones = ref<any[]>([])

const modalVisible = ref(false)
const reporteActivo = ref<any>(null)

const filtros = ref({
  busqueda: '',
  fecha: '',
  problema: '',
  estado: 'En Proceso',
})

const estados = [
  { valor: 'En Proceso', clase: 'estado-teal' },
  { valor: 'Pendiente de Finalización', clase: 'estado-verde' },
]

const conteoPorEstado = computed(() => {
  const conteo: Record<string, number> = {}
  for (const r of reportes.value) {
    conteo[r.estado_jefe] = (conteo[r.estado_jefe] || 0) + 1
  }
  return conteo
})

onMounted(async () => {
  mostrarCargando()
  try {
    const sessionData = localStorage.getItem('userSession')
    if (!sessionData) {
      router.push('/')
      return
    }
    jefe.value = JSON.parse(sessionData)

    if (jefe.value.tipo_id !== 4) {
      Swal.fire('Acceso Denegado', 'No tienes permisos para ver esta sección.', 'error')
      redireccionarUsuario()
      return
    }

    await cargarCatalogos()
    await cargarReportes()
  } finally {
    ocultarCargando()
  }
})

const cargarCatalogos = async () => {
  const { data: problemasData, error: problemasError } = await selectEq(
    'problemas',
    'departamento_id',
    jefe.value.departamento_id,
    ['id', 'nombre', 'departamento_id'],
  )
  if (problemasError) console.error('Error al cargar problemas:', problemasError.message)
  else problemasOpciones.value = problemasData || []

  const { data: deptData, error: deptError } = await selectEq(
    'departamentos',
    'id',
    jefe.value.departamento_id,
    ['id', 'nombre'],
  )
  if (deptError) console.error('Error al cargar departamento:', deptError.message)
  else if (deptData && deptData.length > 0) jefe.value.departamento = deptData[0].nombre
}

const cargarReportes = async () => {
  cargando.value = true
  const { data, error } = await selectEqOrder(
    'reportes',
    'departamento_id',
    jefe.value.departamento_id,
    'created_at',
    [
      'folio',
      'descripcion',
      'domicilio',
      'referencias',
      'foto_url',
      'created_at',
      'problemas(id,nombre)',
      'detalle_reporte(estado_id,fecha_inicio,fecha_cierre,estadoreporte(estado),jefe_id,supervisor_id,supervisores(usuario_id,usuarios(nombre,apellido_p,apellido_m)))',
      'historial_reporte(categoria_historial_id,notas,fecha,foto_url,titulo(nombre))',
    ],
    false,
  )

  if (!error && data) {
    const mapeados = data
      .filter(
        (r: any) =>
          r.detalle_reporte?.jefe_id === jefe.value.id_jefe &&
          [7, 8].includes(r.detalle_reporte?.estado_id),
      )
      .map((r: any) => {
        const s = r.detalle_reporte?.supervisores?.usuarios
        const historial = Array.isArray(r.historial_reporte)
          ? r.historial_reporte
          : r.historial_reporte
            ? [r.historial_reporte]
            : []

        return {
          ...r,
          jefe: jefe.value.nombre,
          supervisor: s
            ? `${s.nombre || ''} ${s.apellido_p || ''} ${s.apellido_m || ''}`.trim()
            : 'No disponible',
          estado: r.detalle_reporte?.estadoreporte?.estado || '',
          estado_jefe:
            r.detalle_reporte?.estado_id === 8 ? 'Pendiente de Finalización' : r.detalle_reporte?.estado_id === 7 ? 'En Proceso' : 'Otro',
          fecha_inicio: r.detalle_reporte?.fecha_inicio || null,
          fecha_cierre: r.detalle_reporte?.fecha_cierre || null,
          notas_avances: notasPorCategoria(historial, 4),
          notas_finalizacion: notasPorCategoria(historial, 3),
          notas_finales_finalizacion: notasPorCategoria(historial, 5),
          notas_denegacion: notasPorCategoria(historial, 6),
        }
      })

    // Primero los estado 7 (En Proceso), luego los 8; el resto al final
    const prioridad = (r: any) => {
      const id = r.detalle_reporte?.estado_id
      return id === 7 ? 0 : id === 8 ? 1 : 2
    }
    mapeados.sort((a: any, b: any) => prioridad(a) - prioridad(b))

    reportes.value = mapeados
  } else if (error) {
    console.error('Error al cargar reportes:', error.message)
    Swal.fire('Error', 'No se pudieron cargar los reportes.', 'error')
  }

  const { data: tFin } = await selectEq('titulo', 'categoria_historial_id', 3, ['id', 'nombre'])
  tituloFinalizacion.value = (tFin || []).slice(0, 1)

  const { data: tAv } = await selectEq('titulo', 'categoria_historial_id', 4, ['id', 'nombre'])
  titulosAvance.value = tAv || []

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

const reportesFiltrados = computed(() => {
  return reportes.value.filter((r) => {
    const q = filtros.value.busqueda.toLowerCase()
    const coincideBusqueda =
      r.folio.toLowerCase().includes(q) || (r.domicilio || '').toLowerCase().includes(q)

    const coincideProblema =
      filtros.value.problema === '' || r.problemas?.id == filtros.value.problema

    let coincideFecha = true
    if (filtros.value.fecha) {
      const fechaUtc = r.created_at.endsWith('Z') ? r.created_at : `${r.created_at}Z`
      const f = new Date(fechaUtc)
      const local = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
      coincideFecha = local === filtros.value.fecha
    }

    const coincideEstado = r.estado_jefe === filtros.value.estado

    return coincideBusqueda && coincideProblema && coincideFecha && coincideEstado
  })
})

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

const descargarPDF = async (reporte: any) => {
  mostrarCargando()
  try {
    await generarPdfReporte(reporte, {
      departamento: jefe.value?.departamento,
      supervisor: reporte.supervisor,
    })
  } catch (error) {
    console.error('Error al generar el PDF:', error)
    Swal.fire('Error', 'No se pudo generar el PDF del reporte.', 'error')
  } finally {
    ocultarCargando()
  }
}

const abrirEvidencia = (modo: 'finalizar' | 'avance', reporte: any) => {
  modoEvidencia.value = modo
  folioEvidencia.value = reporte.folio
  modalEvidenciaVisible.value = true
}
const actualizarAvance = (reporte: any) => abrirEvidencia('avance', reporte)
const finalizarReporte = (reporte: any) => abrirEvidencia('finalizar', reporte)

const cerrarEvidencia = () => {
  modalEvidenciaVisible.value = false
}

const confirmarEvidencia = async (datos: {
  titulo_id: number | string
  tituloNombre: string
  notas: string
  archivo: File
}) => {
  const folio = folioEvidencia.value
  const esFinal = modoEvidencia.value === 'finalizar'

  const result = await Swal.fire({
    title: esFinal ? '¿Enviar finalización?' : '¿Enviar avance?',
    html: esFinal
      ? `Se marcará el reporte <b>${folio}</b> como pendiente de finalización y se enviará tu evidencia al supervisor.`
      : `Se registrará un avance para el reporte <b>${folio}</b>.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#1a6b2f',
    cancelButtonColor: '#888',
    confirmButtonText: 'Sí, enviar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    customClass: { container: 'swal-difuminado' },
  })
  if (!result.isConfirmed) return

  guardandoEvidencia.value = true
  try {
    // 1. Subir la foto
    const ext = datos.archivo.name.split('.').pop()?.toLowerCase() || 'jpg'
    const ruta = `${folio}/${Date.now()}.${ext}`
    const { error: errorFoto } = await uploadFoto(ruta, datos.archivo, 'fotos_avances')
    if (errorFoto) {
      console.error('Error al subir la foto:', errorFoto)
      Swal.fire('Error', 'No se pudo subir la imagen.', 'error')
      return
    }
    const { data: urlData } = await getPublicUrl(ruta, 'fotos_avances')
    const fotoUrl = urlData?.publicUrl
    if (!fotoUrl) {
      Swal.fire('Error', 'No se pudo obtener la URL de la imagen.', 'error')
      return
    }

    // 2. Registrar en el historial (3 = Finalización, 4 = Avance)
    const { error: errorHistorial } = await insert('historial_reporte', {
      folio,
      categoria_historial_id: esFinal ? 3 : 4,
      titulo_id: datos.titulo_id,
      notas: datos.notas,
      foto_url: fotoUrl,
    })
    if (errorHistorial) {
      console.error('Error al guardar historial:', errorHistorial)
      Swal.fire('Error', 'No se pudo registrar en el historial.', 'error')
      return
    }

    // 3. Solo al finalizar: estado 8 (Pendiente de Finalización)
    if (esFinal) {
      const { error: errorEstado } = await updateEq('detalle_reporte', 'folio', folio, {
        estado_id: 8,
      })
      if (errorEstado) {
        console.error('Error al actualizar estado:', errorEstado)
        Swal.fire(
          'Error',
          'La evidencia se guardó, pero no se pudo actualizar el estado del reporte.',
          'error',
        )
        return
      }
    }

    cerrarEvidencia()
    await cargarReportes()

    Swal.fire({
      title: esFinal ? '¡Finalización enviada!' : '¡Avance enviado!',
      text: esFinal
        ? 'El reporte quedó pendiente de finalización.'
        : 'El avance se registró correctamente.',
      icon: 'success',
      confirmButtonColor: '#1a6b2f',
      customClass: { container: 'swal-difuminado' },
    })
  } finally {
    guardandoEvidencia.value = false
  }
}

const cerrarSesion = () => {
  localStorage.removeItem('userSession')
  router.push('/')
}
</script>

<style src="../assets/estadosBotones.css"></style>
<style src="../assets/panelSupervisor.css"></style>
<style src="../assets/panelJefe.css"></style>
