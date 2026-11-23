<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <div class="detalle-header">
            <div class="detalle-info">
              <h3>Detalle del Reporte</h3>

              <div class="folio-row">
                <p class="folio-text" @click="copiarFolio" title="Clic para copiar folio">
                  Folio: <strong>#{{ reporte?.folio }}</strong>
                </p>

                <button type="button" class="btn-copiar-folio" :class="{ 'is-copiado': copiado }" @click="copiarFolio"
                  :title="copiado ? '¡Folio copiado!' : 'Copiar folio al portapapeles'">
                  <component :is="copiado ? Check : Copy" class="icono-copiar" />
                  <span>{{ copiado ? 'Copiado' : 'Copiar' }}</span>
                </button>
              </div>
            </div>

            <div class="estado-actual-box" v-if="!esAdmin && !esAdminEx && !esSupervisor && !esJefe && reporte?.estado">
              <span class="estado-label">Estado Actual</span>
              <span :class="['badge badge-grande', obtenerClaseEstado(reporte.estado.toLowerCase())]">
                {{ traducirEstado(reporte.estado) }}
              </span>
            </div>
          </div>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <div class="modal-body" v-if="reporte">
          <div class="modal-grid">
            <!-- Columna Izquierda: Información del Reporte -->
            <div class="info-columna">
              <div class="info-item" v-if="!esAdmin && !esAdminEx && !esSupervisor && !esJefe">
                <label>Departamento asignado</label>
                <p class="destacado">
                  {{
                    reporte.departamentos?.nombre || reporte.departamentos_externos?.departamento ||
                    reporte.departamentos?.nombreamigable ||
                    'No proporcionado'
                  }}
                </p>
              </div>

              <div class="info-item">
                <label>Problema Reportado</label>
                <p class="destacado">
                  {{
                    reporte.problemas?.nombre || reporte.problemas_externos?.nombre ||
                    reporte.problemas?.nombreamigable || reporte.problemas_externos?.nombreamigable ||
                    'No proporcionado'
                  }}
                </p>
              </div>

              <div class="info-item">
                <label>Descripción</label>
                <div class="descripcion-box">{{ reporte.descripcion }}</div>
              </div>

              <div class="info-item">
                <label>Ubicación</label>

                <div class="ubicacion-container"
                  style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
                  <div>
                    <p>{{ reporte.domicilio }}</p>

                    <p v-if="reporte.referencias" class="referencias">
                      Ref: {{ reporte.referencias || 'No proporcionadas' }}
                    </p>
                  </div>

                  <button v-if="esAdmin || esSupervisor || esJefe" type="button" class="btn-mapa"
                    aria-label="Abrir en Google Maps" title="Abrir en Google Maps"
                    @click="abrirGoogleMaps(reporte.domicilio)">
                    <MapMarker class="btn-mapa" />
                  </button>
                </div>
              </div>

              <div class="info-item" v-if="esAdmin || esSupervisor || esJefe">
                <label>Prioridad</label>
                <p>{{ reporte.prioridad === 1 ? 'Muy Alta' : reporte.prioridad === 2 ? 'Alta' : reporte.prioridad === 3
                  ? 'Media' : reporte.prioridad === 4 ? 'Baja' : reporte.prioridad === 5 ? 'Muy Baja'
                    : 'No proporcionada' }}</p>
              </div>

              <div class="info-grupo-doble">
                <div class="info-item" v-if="esAdmin || esAdminEx">
                  <label>Ciudadano</label>
                  <p>{{ reporte.nombre }}</p>
                </div>
                <div class="info-item" v-if="esAdmin || esAdminEx">
                  <label>Teléfono</label>
                  <p>{{ reporte.telefono }}</p>
                </div>
                <div class="info-item" v-if="esAdmin || esAdminEx">
                  <label>Correo Electrónico</label>
                  <p>{{ reporte.correo || 'No proporcionado' }}</p>
                </div>
                <div class="info-item" v-if="esAdmin || esJefe">
                  <label>Supervisor Asignado</label>
                  <p>{{ reporte.supervisor || 'No proporcionado' }}</p>
                </div>
                <div class="info-item" v-if="esSupervisor || esAdmin">
                  <label>Jefe Asignado</label>
                  <p>{{ reporte.jefe || 'No proporcionado' }}</p>
                </div>
              </div>

              <div class="info-item" v-if="(esAdmin || esSupervisor)">
                <label>Fecha de creación</label>
                <p>{{ formatearFechaLocal(reporte.created_at) }}</p>
              </div>

              <div class="info-item" v-if="(esAdmin || esSupervisor)">
                <label>Fecha de Inicio</label>
                <p>{{ formatearFechaOpcional(reporte.fecha_inicio, 'Aún no ha iniciado') }}</p>
              </div>

              <div class="info-item" v-if="(esAdmin || esSupervisor)">
                <label>Fecha de Cierre</label>
                <p>{{ formatearFechaOpcional(reporte.fecha_cierre, 'Aún no ha finalizado') }}</p>
              </div>

              <!-- Sección de Notas y Registros Históricos -->
              <div class="info-item" v-if="
                reporte.estado === 'Rechazado' &&
                (esAdmin || esAdminEx || (!esAdmin && !esAdminEx && !esSupervisor && !esJefe)) &&
                reporte.notas_rechazo?.length
              ">
                <label>Notas de Rechazo</label>
                <div class="notas-lista">
                  <article v-for="(n, i) in reporte.notas_rechazo" :key="i" class="nota-card nota-rechazo">
                    <header class="nota-meta">
                      <span class="nota-titulo">{{ n.titulo }}</span>
                      <time class="nota-fecha">{{ n.fecha }} · {{ n.hora }}</time>
                    </header>
                    <p class="nota-texto">{{ n.notas }}</p>
                  </article>
                </div>
              </div>

              <div class="info-item" v-if="
                reporte.estado === 'Devuelto' &&
                (esAdmin || esAdminEx) &&
                reporte.notas_devuelto?.length
              ">
                <label>Notas de Devolución</label>
                <div class="notas-lista">
                  <article v-for="(n, i) in reporte.notas_devuelto" :key="i" class="nota-card nota-devuelto">
                    <header class="nota-meta">
                      <span class="nota-titulo">{{ n.titulo }}</span>
                      <time class="nota-fecha">{{ n.fecha }} · {{ n.hora }}</time>
                    </header>
                    <p class="nota-texto">{{ n.notas }}</p>
                  </article>
                </div>
              </div>

              <div class="info-item" v-if="
                reporte.estado === 'Turnado' &&
                (esAdmin || esAdminEx) &&
                reporte.notas_turnado?.length
              ">
                <label>Notas de Turnado</label>
                <div class="notas-lista">
                  <article v-for="(n, i) in reporte.notas_turnado" :key="i" class="nota-card nota-turnado">
                    <header class="nota-meta">
                      <span class="nota-titulo">{{ n.titulo }}</span>
                      <time class="nota-fecha">{{ n.fecha }} · {{ n.hora }}</time>
                    </header>
                    <p class="nota-texto">{{ n.notas }}</p>
                  </article>
                </div>
              </div>

              <div class="info-item" v-if="
                (esAdmin || esSupervisor || esJefe) &&
                reporte.notas_finales_finalizacion?.length
              ">
                <label>Registro Final de finalización</label>
                <div class="notas-lista">
                  <article v-for="(n, i) in reporte.notas_finales_finalizacion" :key="i"
                    class="nota-card nota-finalizacion">
                    <header class="nota-meta">
                      <span class="nota-titulo">{{ n.titulo }}</span>
                      <time class="nota-fecha">{{ n.fecha }} · {{ n.hora }}</time>
                    </header>
                    <p class="nota-texto">{{ n.notas }}</p>
                    <a v-if="n.foto_url" :href="n.foto_url" target="_blank" rel="noopener">
                      <img :src="n.foto_url" alt="Registro de finalización" class="nota-foto" />
                    </a>
                  </article>
                </div>
              </div>

              <div class="info-item" v-if="(esSupervisor || esJefe) && reporte.notas_denegacion?.length">
                <label>Registro de Denegación</label>
                <div class="notas-lista">
                  <article v-for="(n, i) in reporte.notas_denegacion" :key="i" class="nota-card nota-finalizacion">
                    <header class="nota-meta">
                      <span class="nota-titulo">{{ n.titulo }}</span>
                      <time class="nota-fecha">{{ n.fecha }} · {{ n.hora }}</time>
                    </header>
                    <p class="nota-texto">{{ n.notas }}</p>
                    <a v-if="n.foto_url" :href="n.foto_url" target="_blank" rel="noopener">
                      <img :src="n.foto_url" alt="Registro de finalización" class="nota-foto" />
                    </a>
                  </article>
                </div>
              </div>

              <div class="info-item" v-if="(esJefe || esSupervisor) && reporte.notas_finalizacion?.length">
                <label>Petición de finalización</label>
                <div class="notas-lista">
                  <article v-for="(n, i) in reporte.notas_finalizacion" :key="i" class="nota-card nota-finalizacion">
                    <header class="nota-meta">
                      <span class="nota-titulo">{{ n.titulo }}</span>
                      <time class="nota-fecha">{{ n.fecha }} · {{ n.hora }}</time>
                    </header>
                    <p class="nota-texto">{{ n.notas }}</p>
                    <a v-if="n.foto_url" :href="n.foto_url" target="_blank" rel="noopener">
                      <img :src="n.foto_url" alt="Evidencia de finalización" class="nota-foto" />
                    </a>
                  </article>
                </div>
              </div>

              <div class="info-item" v-if="(esJefe || esSupervisor || esAdmin) && reporte.notas_avances?.length">
                <label>Avances registrados</label>
                <div class="notas-lista">
                  <article v-for="(n, i) in reporte.notas_avances" :key="i" class="nota-card nota-avance">
                    <header class="nota-meta">
                      <span class="nota-titulo">{{ n.titulo }}</span>
                      <time class="nota-fecha">{{ n.fecha }} · {{ n.hora }}</time>
                    </header>
                    <p class="nota-texto">{{ n.notas }}</p>
                    <a v-if="n.foto_url" :href="n.foto_url" target="_blank" rel="noopener">
                      <img :src="n.foto_url" alt="Evidencia del avance" class="nota-foto" />
                    </a>
                  </article>
                </div>
              </div>
            </div>

            <!-- Columna Derecha: Foto, Estado y Mensaje de IA -->
            <div class="foto-columna">
              <label>Evidencia Fotográfica</label>
              <div class="foto-contenedor">
                <img v-if="reporte.foto_url" :src="reporte.foto_url" alt="Evidencia" />
                <div v-else class="sin-foto">Sin imagen</div>
              </div>

              <div class="info-item ia-card" v-if="reporte.mensajeAI && (esSupervisor || esAdmin)"
                :class="reporte.fotoTipoID === 0 ? 'ia-card--ok' : 'ia-card--alerta'">
                <div class="ia-header">
                  <label>Validación de la IA</label>
                  <span class="ia-tag">
                    <i :class="reporte.fotoTipoID === 0 ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'"></i>
                    {{ reporte.fotoTipoID === 0 ? 'Coincidencia validada' : 'Revisar observación' }}
                  </span>
                </div>

                <div class="ia-mensaje-box">
                  {{ reporte.mensajeAI }}
                </div>
              </div>

              <div class="estado-actual-box" v-if="esAdmin || esAdminEx || esSupervisor || esJefe">
                <label>Estado Actual</label>
                <span :class="[
                  'badge badge-grande',
                  obtenerClaseEstado(reporte.estado.toLowerCase()),
                ]">
                  {{ reporte.estado }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secundario" @click="cerrar">Cerrar</button>

          <button class="btn-primario" title="Descargar PDF" @click="$emit('descargar-pdf', reporte)"
            v-if="esAdmin || esAdminEx || esSupervisor || esJefe">
            Descargar PDF
          </button>

          <button v-if="!esAdmin && !esAdminEx && !esSupervisor && !esJefe" class="btn-primario" @click="buscarReporte">
            Buscar Otro Reporte
          </button>

          <template v-if="reporte">
            <button v-if="
              (esAdmin || esAdminEx) &&
              (reporte.estado === 'Pendiente' ||
                reporte.estado === 'Turnado' ||
                reporte.estado === 'Devuelto') &&
              reporte.problemas?.nombre != null
            " class="btn-primario" @click="$emit('asignar', reporte?.folio)">
              Asignar Supervisor
            </button>

            <button v-if="
              esSupervisor &&
              reporte.estado === 'Pendiente de Asignación' &&
              reporte.problemas?.nombre != null
            " class="btn-primario" @click="$emit('asignarJefe', reporte?.folio)">
              Asignar Jefe
            </button>

            <button v-if="esAdmin && reporte.estado === 'Devuelto' && reporte.problemas?.nombre != null"
              class="btn-primario" @click="$emit('turnar', reporte?.folio)">
              Turnar Reporte
            </button>

            <button v-if="
              (esAdmin || esAdminEx) &&
              (reporte.estado === 'Finalizado' ||
                reporte.estado === 'Devuelto' ||
                reporte.estado === 'Rechazado')
            " class="btn-primario" @click="$emit('devolver', reporte?.folio, 'Pendiente')">
              Devolver a Pendiente
            </button>

            <button v-if="esSupervisor && reporte.estado === 'Pendiente de Asignación'" class="btn-primario"
              @click="$emit('devolverRep', reporte?.folio, 'Devuelto')">
              Devolver Reporte
            </button>

            <button v-if="esJefe && reporte.estado === 'En Proceso'" class="btn-primario"
              @click="$emit('actualizarAvance', reporte)">
              Actualizar Avance
            </button>

            <button v-if="esJefe && reporte.estado === 'En Proceso'" class="btn-primario"
              @click="$emit('enviarPeticionFinalizacion', reporte)">
              Enviar Petición de Finalización
            </button>

            <button v-if="
              (esAdmin || esAdminEx) &&
              (reporte.estado === 'Pendiente' || reporte.estado === 'Devuelto')
            " class="btn-peligroso" @click="$emit('rechazar', reporte?.folio)">
              Rechazar Reporte
            </button>

            <button v-if="esAdminEx && reporte.estado === 'Pendiente'" class="btn-primario"
              @click="$emit('devolver', reporte?.folio, 'Finalizado')">
              Finalizar Reporte
            </button>

            <button v-if="esSupervisor && reporte.estado === 'Pendiente de Finalización'" class="btn-primario"
              @click="$emit('finalizarSupervisor', reporte)">
              Finalizar Reporte
            </button>
          </template>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import {
  formatearFechaLocal,
  obtenerClaseEstado,
  traducirEstado,
} from '../logic/reporteDetalleModal'

import { defineProps, defineEmits } from 'vue'
import { ref } from 'vue'

import MapMarker from '@primeicons/vue/map-marker';
import Copy from '@primeicons/vue/copy'
import Check from '@primeicons/vue/check'

const abrirGoogleMaps = (domicilio: string) => {
  if (!domicilio) return

  const destino = `${domicilio}, Culiacán, Sinaloa, México`

  // Mostrar el domicilio con un marcador en Google Maps
  const abrirSoloDestino = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (!navigator.geolocation) {
    abrirSoloDestino()
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const origen = `${position.coords.latitude},${position.coords.longitude}`

      const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origen)}&destination=${encodeURIComponent(destino)}&travelmode=driving`

      window.open(url, '_blank', 'noopener,noreferrer')
    },
    () => {
      abrirSoloDestino()
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
}

const formatearFechaOpcional = (valor: string | null | undefined, vacio: string) =>
  valor ? formatearFechaLocal(valor) : vacio

const emit = defineEmits([
  'close',
  'asignar',
  'asignarJefe',
  'rechazar',
  'buscar',
  'devolver',
  'devolverRep',
  'turnar',
  'enviarPeticionFinalizacion',
  'actualizarAvance',
  'finalizar',
  'descargar-pdf',
  'finalizarSupervisor',
])

const cerrar = () => {
  emit('close')
}
const finalizarReporte = () => {
  emit('finalizar')
}

const buscarReporte = () => {
  emit('buscar')
}

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  reporte: {
    type: Object,
    default: null,
  },
  esAdmin: {
    type: Boolean,
    default: false,
  },
  esAdminEx: {
    type: Boolean,
    default: false,
  },
  esSupervisor: {
    type: Boolean,
    default: false,
  },
  esJefe: {
    type: Boolean,
    default: false,
  },
})

const copiado = ref(false)

const copiarFolio = async () => {
  try {
    await navigator.clipboard.writeText(props.reporte.folio)
    copiado.value = true

    // Ocultar mensaje después de 2 segundos
    setTimeout(() => {
      copiado.value = false
    }, 2000)
  } catch (err) {
    console.error('Error al copiar el folio:', err)
  }
}
</script>

<style src="../assets/reporteDetalle.css" />

<style scoped>

.btn-copiar-folio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background-color: #f9fafb;
  color: #374151;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-copiar-folio:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.btn-copiar-folio.is-copiado {
  background-color: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

.icono-copiar {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
.info-item label {
  display: block;
  font-size: 0.8rem;
  color: #777;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 4px;
}

.info-item p {
  margin: 0;
  font-size: 1rem;
  color: #222;
}

.info-item .destacado {
  font-weight: 700;
  font-size: 1.1rem;
  color: #621132;
}

.descripcion-box {
  background: #f9f9f9;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #eee;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #444;
}

/* Bloque destacado para la validación de la IA */
.ia-card {
  margin-top: 0.5rem;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  border-left-width: 5px;
}

.ia-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.ia-header label {
  margin-bottom: 0;
}

.ia-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
}

.ia-mensaje-box {
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.5;
}

/* Estado válido (fotoTipoID === 0) */
.ia-card--ok {
  background-color: #eef8f0;
  border-color: #b7e1c0;
  border-left-color: #1f7a38;
}

.ia-card--ok label,
.ia-card--ok .ia-mensaje-box {
  color: #155724;
}

.ia-card--ok .ia-tag {
  background-color: #d4edda;
  color: #155724;
}

/* Estado de alerta / discrepancia */
.ia-card--alerta {
  background-color: #fff2f2;
  border-color: #f5c2c7;
  border-left-color: #c62828;
}

.ia-card--alerta label,
.ia-card--alerta .ia-mensaje-box {
  color: #842029;
}

.ia-card--alerta .ia-tag {
  background-color: #f8d7da;
  color: #842029;
}
</style>