<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3>Detalle del Reporte</h3>
            <p class="folio-text">Folio: #{{ reporte?.folio }}</p>
          </div>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <div class="modal-body" v-if="reporte">
          <div class="modal-grid">
            <!-- Columna Info -->
            <div class="info-columna">
              <div class="info-item">
                <label>Problema Reportado</label>
                <p class="destacado">
                  {{
                    reporte.problemas?.nombreamigable || reporte.problemas_externos?.nombreamigable
                  }}
                </p>
              </div>

              <div class="info-item">
                <label>Descripción</label>
                <div class="descripcion-box">{{ reporte.descripcion }}</div>
              </div>

              <div class="info-item">
                <label>Ubicación</label>
                <p>{{ reporte.domicilio }}</p>
                <p v-if="reporte.referencias" class="referencias">
                  Ref: {{ reporte.referencias || 'No proporcionadas' }}
                </p>
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

              <div class="info-item">
                <label>Fecha de creación</label>
                <p>{{ formatearFechaLocal(reporte.created_at) }}</p>
              </div>

              <div class="info-item" v-if="verSeguimiento">
                <label>Fecha de Inicio</label>
                <p>{{ formatearFechaOpcional(reporte.fecha_inicio, 'Aún no ha iniciado') }}</p>
              </div>

              <div class="info-item" v-if="verSeguimiento">
                <label>Fecha de Cierre</label>
                <p>{{ formatearFechaOpcional(reporte.fecha_cierre, 'Aún no ha finalizado') }}</p>
              </div>

              <div
                class="info-item"
                v-if="
                  reporte.estado === 'Rechazado' &&
                  (esAdmin || esAdminEx) &&
                  reporte.notas_rechazo?.length
                "
              >
                <label>Notas de Rechazo</label>
                <div class="notas-lista">
                  <article
                    v-for="(n, i) in reporte.notas_rechazo"
                    :key="i"
                    class="nota-card nota-rechazo"
                  >
                    <header class="nota-meta">
                      <span class="nota-titulo">{{ n.titulo }}</span>
                      <time class="nota-fecha">{{ n.fecha }} · {{ n.hora }}</time>
                    </header>
                    <p class="nota-texto">{{ n.notas }}</p>
                  </article>
                </div>
              </div>

              <div
                class="info-item"
                v-if="
                  reporte.estado === 'Devuelto' &&
                  (esAdmin || esAdminEx) &&
                  reporte.notas_devuelto?.length
                "
              >
                <label>Notas de Devolución</label>
                <div class="notas-lista">
                  <article
                    v-for="(n, i) in reporte.notas_devuelto"
                    :key="i"
                    class="nota-card nota-devuelto"
                  >
                    <header class="nota-meta">
                      <span class="nota-titulo">{{ n.titulo }}</span>
                      <time class="nota-fecha">{{ n.fecha }} · {{ n.hora }}</time>
                    </header>
                    <p class="nota-texto">{{ n.notas }}</p>
                  </article>
                </div>
              </div>

              <!-- Columna Foto -->
              <div class="foto-columna">
                <label>Evidencia Fotográfica</label>
                <div class="foto-contenedor">
                  <img v-if="reporte.foto_url" :src="reporte.foto_url" alt="Evidencia" />
                  <div v-else class="sin-foto">Sin imagen</div>
                </div>

                <div
                  class="estado-actual-box"
                  v-if="esAdmin || esAdminEx || esSupervisor || esJefe"
                >
                  <label>Estado Actual</label>
                  <span
                    :class="[
                      'badge badge-grande',
                      obtenerClaseEstado(reporte.estado.toLowerCase()),
                    ]"
                  >
                    {{ reporte.estado }}
                  </span>
                </div>
              </div>

                <div
                  class="info-item"
                  v-if="
                    (esAdmin || esSupervisor || esJefe) &&
                    reporte.notas_finales_finalizacion?.length
                  "
                >
                  <label>Registro Final de finalización</label>
                  <div class="notas-lista">
                    <article
                      v-for="(n, i) in reporte.notas_finales_finalizacion"
                      :key="i"
                      class="nota-card nota-finalizacion"
                    >
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

                <div
                  class="info-item"
                  v-if="(esSupervisor || esJefe) && reporte.notas_denegacion?.length"
                >
                  <label>Registro de Denegación</label>
                  <div class="notas-lista">
                    <article
                      v-for="(n, i) in reporte.notas_denegacion"
                      :key="i"
                      class="nota-card nota-finalizacion"
                    >
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
              </div>

              <div
                class="info-item"
                v-if="(esJefe || esSupervisor) && reporte.notas_finalizacion?.length"
              >
                <label>Petición de finalización</label>
                <div class="notas-lista">
                  <article
                    v-for="(n, i) in reporte.notas_finalizacion"
                    :key="i"
                    class="nota-card nota-finalizacion"
                  >
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

              <div
                class="info-item"
                v-if="(esJefe || esSupervisor || esAdmin) && reporte.notas_avances?.length"
              >
                <label>Avances registrados</label>
                <div class="notas-lista">
                  <article
                    v-for="(n, i) in reporte.notas_avances"
                    :key="i"
                    class="nota-card nota-avance"
                  >
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

              <div
                class="estado-actual-box"
                v-if="!esAdmin && !esAdminEx && !esSupervisor && !esJefe"
              >
                <label>Estado Actual</label>
                <span
                  :class="['badge badge-grande', obtenerClaseEstado(reporte.estado.toLowerCase())]"
                >
                  {{ traducirEstado(reporte.estado) }}
                </span>
              </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secundario" @click="cerrar">Cerrar</button>

          <button
            class="btn-primario"
            title="Descargar PDF"
            @click="$emit('descargar-pdf', reporte)"
          >
            Descargar PDF
          </button>

          <button
            v-if="!esAdmin && !esAdminEx && !esSupervisor && !esJefe"
            class="btn-primario"
            @click="buscarReporte"
          >
            Buscar Otro Reporte
          </button>

          <template v-if="reporte">
            <button
              v-if="
                (esAdmin || esAdminEx) &&
                (reporte.estado === 'Pendiente' ||
                  reporte.estado === 'Turnado' ||
                  reporte.estado === 'Devuelto') &&
                reporte.problemas?.nombre != null
              "
              class="btn-primario"
              @click="$emit('asignar', reporte?.folio)"
            >
              Asignar Supervisor
            </button>

            <button
              v-if="
                esSupervisor &&
                reporte.estado === 'Pendiente de Asignación' &&
                reporte.problemas?.nombre != null
              "
              class="btn-primario"
              @click="$emit('asignarJefe', reporte?.folio)"
            >
              Asignar Jefe
            </button>

            <button
              v-if="esAdmin && reporte.estado === 'Devuelto' && reporte.problemas?.nombre != null"
              class="btn-primario"
              @click="$emit('turnar', reporte?.folio)"
            >
              Turnar Reporte
            </button>

            <button
              v-if="
                (esAdmin || esAdminEx) &&
                (reporte.estado === 'Finalizado' ||
                  reporte.estado === 'Devuelto' ||
                  reporte.estado === 'Rechazado')
              "
              class="btn-primario"
              @click="$emit('devolver', reporte?.folio, 'Pendiente')"
            >
              Devolver a Pendiente
            </button>

            <button
              v-if="esSupervisor && reporte.estado === 'Pendiente de Asignación'"
              class="btn-primario"
              @click="$emit('devolverRep', reporte?.folio, 'Devuelto')"
            >
              Devolver Reporte
            </button>

            <button
              v-if="esJefe && reporte.estado === 'En Proceso'"
              class="btn-primario"
              @click="$emit('actualizarAvance', reporte)"
            >
              Actualizar Avance
            </button>

            <button
              v-if="esJefe && reporte.estado === 'En Proceso'"
              class="btn-primario"
              @click="$emit('enviarPeticionFinalizacion', reporte)"
            >
              Enviar Petición de Finalización
            </button>

            <button
              v-if="
                (esAdmin || esAdminEx) &&
                (reporte.estado === 'Pendiente' || reporte.estado === 'Devuelto')
              "
              class="btn-peligroso"
              @click="$emit('rechazar', reporte?.folio)"
            >
              Rechazar Reporte
            </button>

            <button
              v-if="esAdminEx && reporte.estado === 'Pendiente'"
              class="btn-primario"
              @click="$emit('devolver', reporte?.folio, 'Finalizado')"
            >
              Finalizar Reporte
            </button>

            <button
              v-if="esSupervisor && reporte.estado === 'Pendiente de Finalización'"
              class="btn-primario"
              @click="$emit('finalizarSupervisor', reporte)"
            >
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
</script>

<style src="../assets/reporteDetalle.css" />
