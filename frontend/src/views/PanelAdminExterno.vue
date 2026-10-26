<template>
  <div class="dashboard-layout">
    <!-- Barra Superior -->
    <nav class="topbar">
      <div class="topbar-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
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
      <header class="content-header" v-if="admin">
        <h2>Reportes Turnados a su Dependencia</h2>
        <p>Consulte el detalle de los reportes recibidos y actualice su estado de atención.</p>
      </header>

      <!-- Botones de estado -->
      <section class="estados-grid estados-grid--tres" aria-label="Filtrar reportes por estado">
        <button v-for="e in estados" :key="e.valor" type="button"
          :class="['estado-btn', e.clase, { activo: filtros.estado === e.valor }]"
          :aria-pressed="filtros.estado === e.valor" @click="filtros.estado = e.valor">
          <span class="estado-nombre">{{ e.valor }}</span>
          <span class="estado-conteo">{{ conteoPorEstado[e.valor] || 0 }}</span>
        </button>
      </section>

      <!-- Panel de Filtros -->
      <section class="filtros-card">
        <div class="filtro-grupo input-icono">
          <svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" width="18" height="18">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input v-model="filtros.busqueda" type="text"
            placeholder="Buscar por folio, nombre, teléfono o dirección..." />
        </div>

        <!--<div class="filtro-grupo">
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
        </div>-->
      </section>

      <!-- Tabla de Datos -->
      <div class="tabla-contenedor">
        <table class="tabla-reportes">
          <thead>
            <tr>
              <th>FOLIO</th>
              <th>FECHA TURNADO</th>
              <th>PROBLEMÁTICA REPORTADA</th>
              <th>DOMICILIO</th>
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
                  <span>{{ truncarTexto(reporte.problemas_externos?.nombreamigable, 25) }}</span>
                  <small>{{ truncarTexto(reporte.problemas_externos?.nombre, 25) }}</small>
                </div>
              </td>
              <td :title="reporte.domicilio">
                <div class="ciudadano-info">
                  <span>{{ truncarTexto(reporte.domicilio.split(',')[1], 25) }}</span>
                  <small>{{ truncarTexto(reporte.domicilio.split(',')[0], 25) }}</small>
                </div>
              </td>
              <td class="text-center">
                <span :class="[
                  'badge',
                  obtenerClaseEstado(
                    reporte.detalle_reporte?.estadoreporte?.estado.toLowerCase(),
                  ),
                ]">
                  {{ reporte.detalle_reporte?.estadoreporte?.estado }}
                </span>
              </td>

              <td class="acciones-celda">
                <button class="btn-accion btn-pdf" title="Descargar PDF" @click="descargarPDF(reporte)">
                  📄
                </button>
                <button class="btn-accion" title="Ver detalle" @click="abrirModalVer(reporte)">
                  👁️
                </button>

                <button v-if="reporte.detalle_reporte?.estadoreporte?.estado === 'Pendiente'" class="btn-accion"
                  title="Rechazar reporte" :disabled="foliosProcesando.has(reporte.folio)"
                  @click="rechazarReporte(reporte.folio)">
                  ❌
                </button>

                <button v-if="reporte.detalle_reporte?.estadoreporte?.estado === 'Pendiente'" class="btn-accion"
                  title="Finalizar reporte" :disabled="foliosProcesando.has(reporte.folio)"
                  @click="devolverReporte(reporte.folio, 'Finalizado')">
                  ✅
                </button>

                <button v-if="
                  reporte.detalle_reporte?.estadoreporte?.estado === 'Rechazado' ||
                  reporte.detalle_reporte?.estadoreporte?.estado === 'Finalizado'
                " class="btn-accion" title="Devolver a Pendiente" :disabled="foliosProcesando.has(reporte.folio)"
                  @click="devolverReporte(reporte.folio, 'Pendiente')">
                  🔄
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <ReporteDetalleModal :visible="modalVisible" :reporte="reporteActivo" :esAdminEx="true" @close="cerrarModalVer"
      @rechazar="rechazarReporte" @devolver="devolverReporte" @finalizar="devolverReporte"
      @descargar-pdf="descargarPDF" />

    <DescargarPdfModal :visible="modalPdfVisible" :folio="reportePdf?.folio || ''" :correo-inicial="admin?.correo || ''"
      :procesando="procesandoPdf" @close="cerrarModalPdf" @descargar="descargarSoloLocal" @enviar="descargarYEnviar" />
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
import {
  esperarUsuario,
  obtenerProblematicasExternasPorID,
  obtenerReportesPorDepartamentoExternoID,
  actualizarEstadoReporte,
  obtenerDepartamentosExternosPorID,
} from '../services/supabaseController'
import { truncarTexto } from '../logic/panelAdministrador'
import { generarPdfReporte } from '../logic/reportePdf'
import DescargarPdfModal from '../components/DescargarPdfModal.vue'
import { enviarCorreoRechazoReporte, enviarCorreoFinalizacionReporte, enviarCorreoReportePDF } from '../services/gmailController'

const modalPdfVisible = ref(false)
const reportePdf = ref<any>(null)
const procesandoPdf = ref(false)

const router = useRouter()
const admin = ref<any>(null)
const cargando = ref(true)
const reportes = ref<any[]>([])
const foliosProcesando = ref(new Set<string>())
const problemasOpciones = ref<any[]>([])
const estados = [
  { valor: 'Pendiente', clase: 'estado-gris' },
  { valor: 'Finalizado', clase: 'estado-gris' },
  { valor: 'Rechazado', clase: 'estado-gris' },
]

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

  admin.value = JSON.parse(sessionData)

  if (admin.value.tipo_id !== 6) {
    Swal.fire('Acceso Denegado', 'No tienes permisos para ver esta sección. Externo', 'error')
    redireccionarUsuario()
    return
  }

  try {
    await esperarUsuario(2000).catch(() => null) // Espera máx 2 segundos
    await cargarCatalogos()
    await cargarReportes()
  } catch (error) {
    console.error('Error al cargar datos:', error)
    Swal.fire('Error', 'Hubo un problema al cargar los datos. Intenta nuevamente.', 'error')
  } finally {
    ocultarCargando() // Ocultar el indicador de carga al finalizar
  }
})

const cargarCatalogos = async () => {
  // Traer solo problemas del departamento del admin
  const { data: problemasData, error: problemasError } = await obtenerProblematicasExternasPorID(
    admin.value.departamento_id,
  )

  if (problemasError) {
    console.error('Error al cargar problemas:', problemasError)
  } else {
    problemasOpciones.value = problemasData || []
  }

  // Traer nombre del departamento para mostrarlo en el header
  const { data: deptData, error: deptError } = await obtenerDepartamentosExternosPorID(
    admin.value.departamento_id,
  )

  if (deptError) {
    console.error('Error al cargar departamento:', deptError.message)
  } else if (deptData && deptData.length > 0) {
    admin.value.departamento = deptData[0]?.departamento
  }
}

// Paso 1: solo abre el modal (también sirve desde el modal de detalle)
const descargarPDF = (reporte: any) => {
  reportePdf.value = reporte
  modalPdfVisible.value = true
}

const cerrarModalPdf = () => {
  modalPdfVisible.value = false
}

const opcionesPdf = () => ({
  departamento: admin.value?.departamento || 'No disponible',
  supervisor: 'No disponible',
})

// Solo descargar en local (lo que ya hacía)
const descargarSoloLocal = async () => {
  procesandoPdf.value = true
  try {
    await generarPdfReporte(reportePdf.value, opcionesPdf())
    cerrarModalPdf()
  } catch (error) {
    console.error('Error al generar el PDF:', error)
    Swal.fire('Error', 'No se pudo generar el PDF del reporte.', 'error')
  } finally {
    procesandoPdf.value = false
  }
}

// Descargar en local + enviar por correo
const descargarYEnviar = async (correo: string) => {
  procesandoPdf.value = true
  try {
    const resultado = await generarPdfReporte(reportePdf.value, {
      ...opcionesPdf(),
      devolverBlob: true,
    })
    if (!resultado) throw new Error('No se generó el archivo')
    const { blob, nombreArchivo } = resultado

    // 1. Descarga local (mismo comportamiento que antes)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombreArchivo
    a.click()
    URL.revokeObjectURL(url)

    // 2. Enviar correo por Gmail del Reporte en PDF
    const correoData = {
      folio: reportePdf.value.folio,
      departamento: admin.value.departamento,
      problema: reportePdf.value.problemas_externos?.nombre || 'No disponible',
      titulo: reportePdf.value.titulo || 'No disponible',
      notas: reportePdf.value.notas || 'No disponible',
      correo: correo || admin.value.correo || '',
      pdfBlob: blob,
      pdfNombre: nombreArchivo,
    }

    const resultadoGmail = await enviarCorreoReportePDF(correoData)

    if (!resultadoGmail.ok) {
      console.error('Error al enviar:', resultadoGmail.mensaje)
      console.error('Error detallado:', resultadoGmail.error)
    }

    cerrarModalPdf()
    Swal.fire({
      title: 'PDF descargado',
      html: `El archivo se descargó en tu equipo. El envío a <b>${correo}</b> estará disponible cuando se conecte el servicio de correo.`,
      icon: 'info',
      confirmButtonColor: '#1a6b2f',
      customClass: { container: 'swal-difuminado' },
    })
  } catch (error) {
    console.error('Error al generar o enviar el PDF:', error)
    Swal.fire('Error', 'No se pudo generar el PDF del reporte.', 'error')
  } finally {
    procesandoPdf.value = false
  }
}

const cargarReportes = async () => {
  cargando.value = true
  const { data, error } = await obtenerReportesPorDepartamentoExternoID(admin.value.departamento_id)

  if (!error && data) {
    reportes.value = data.map((r) => ({
      ...r,
      estado: r.detalle_reporte?.estadoreporte?.estado || 'Pendiente',
    }))
    cargando.value = false
  }
  if (error) {
    console.error('Error al cargar reportes:', error)
  }
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
      const { error } = await actualizarEstadoReporte(folio, { estado_id: 3 }) // 3 = Rechazado

      if (!error) {
        const index = reportes.value.findIndex((r) => r.folio === folio)
        if (index !== -1) reportes.value[index].estado = 'Rechazado'

        // Enviar correo por Gmail de rechazo del reporte
        const correoData = {
          folio,
          departamento: admin.value.departamento,
          problema: reporteActivo.value?.problemas?.nombre || 'No disponible',
          titulo: reporteActivo.value?.titulo || 'No disponible',
          notas: reporteActivo.value?.notas || 'No disponible',
          correo: reporteActivo.value?.correo || '',
        }

        const resultadoGmail = await enviarCorreoRechazoReporte(correoData)

        if (!resultadoGmail.ok) {
          console.error('Error al enviar:', resultadoGmail.mensaje)
          console.error('Error detallado:', resultadoGmail.error)
        }

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

        console.error('Error al rechazar reporte:', error)
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
      const { error } = await actualizarEstadoReporte(folio, {
        estado_id: nuevoEstado === 'Finalizado' ? 4 : 1, // 4 = Finalizado, 1 = Pendiente
      })

      if (!error) {
        const index = reportes.value.findIndex((r) => r.folio === folio)
        if (index !== -1) reportes.value[index].estado = nuevoEstado

        // Enviar correo por Gmail de finalización del reporte si es "Finalizado"
        if (nuevoEstado === 'Finalizado') {
          const correoData = {
            folio,
            departamento: admin.value.departamento,
            problema: reporteActivo.value?.problemas?.nombre || 'No disponible',
            titulo: reporteActivo.value?.titulo || 'No disponible',
            notas: reporteActivo.value?.notas || 'No disponible',
            correo: reporteActivo.value?.correo || '',
          }

          const resultadoGmail = await enviarCorreoFinalizacionReporte(correoData)

          if (!resultadoGmail.ok) {
            console.error('Error al enviar:', resultadoGmail.mensaje)
            console.error('Error detallado:', resultadoGmail.error)
          }

          Swal.fire({
            title: '¡Actualizado!',
            text: `El reporte ahora está en "${nuevoEstado}".`,
            icon: 'success',
            confirmButtonColor: '#1a6b2f',
          })
        } else {
          console.error('Error al actualizar estado del reporte:', error)
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
    cerrarSesion,
    foliosProcesando,
  })
</script>

<style src="../assets/estadosBotones.css"></style>
<style src="../assets/panelAdministrador.css" />
