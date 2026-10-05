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
                <p class="destacado">{{ reporte.problemas?.nombreamigable || reporte.problemas_externos?.nombreamigable }}</p>
              </div>

              <div class="info-item">
                <label>Descripción</label>
                <div class="descripcion-box">{{ reporte.descripcion }}</div>
              </div>

              <div class="info-item">
                <label>Ubicación</label>
                <p>{{ reporte.domicilio }}</p>
                <p v-if="reporte.referencias" class="referencias">Ref: {{ reporte.referencias || 'No proporcionadas' }}</p>
              </div>

              <div class="info-grupo-doble">
                <div class="info-item">
                  <label>Ciudadano</label>
                  <p>{{ reporte.nombre }}</p>
                </div>
                <div class="info-item"
                v-if="esAdmin || esAdminEx">
                  <label>Teléfono</label>
                  <p>{{ reporte.telefono }}</p>
                </div>
                <div class="info-item"
                v-if="esAdmin || esAdminEx">
                  <label>Correo Electrónico</label>
                  <p>{{ reporte.correo || 'No proporcionado' }}</p>
                </div>
              </div>

              <div class="info-item">
                <label>Fecha de creación</label>
                <p>{{ formatearFechaLocal(reporte.created_at) }}</p>
              </div>
            </div>

            <!-- Columna Foto -->
            <div class="foto-columna">
              <label>Evidencia Fotográfica</label>
              <div class="foto-contenedor">
                <img v-if="reporte.foto_url" :src="reporte.foto_url" alt="Evidencia" />
                <div v-else class="sin-foto">Sin imagen</div>
              </div>

              <div class="estado-actual-box">
                <label>Estado Actual</label>
                <span
                  :class="['badge badge-grande', obtenerClaseEstado(reporte.estado.toLowerCase())]"
                >
                  {{ reporte.estado }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secundario" @click="cerrar">Cerrar</button>

          <button v-if="(!esAdmin && !esAdminEx)" class="btn-primario" @click="buscarReporte">
            Buscar Otro Reporte
          </button>

          <template v-if="reporte">
            <button
              v-if="(esAdmin || esAdminEx) && (reporte.estado === 'Pendiente' || reporte.estado === 'Turnado' )&& reporte.problemas?.nombre != null"
              class="btn-primario"
              @click="$emit('asignar', reporte?.folio)"
            >
              Asignar Supervisor
            </button>

            <button
              v-if="esAdmin && reporte.estado === 'Devuelto' && reporte.problemas?.nombre != null"
              class="btn-primario"
              @click="$emit('turnar', reporte?.folio)"
            >
              Turnar Reporte
            </button>

            <button
              v-if="(esAdmin || esAdminEx) && (reporte.estado === 'Finalizado' || reporte.estado === 'Devuelto' || reporte.estado === 'Rechazado')"
              class="btn-primario"
              @click="$emit('devolver', reporte?.folio, 'Pendiente')"
            >
              Devolver a Pendiente
            </button>

            <button
              v-if="(esAdmin || esAdminEx) && (reporte.estado  === 'Pendiente' || reporte.estado === 'Devuelto')"
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
          </template>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { formatearFechaLocal, obtenerClaseEstado } from '../logic/reporteDetalleModal'

const emit = defineEmits(['close', 'asignar', 'rechazar', 'buscar', 'devolver', 'turnar', 'finalizar'])

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
})

</script>

<style src="../assets/reporteDetalle.css"/>
