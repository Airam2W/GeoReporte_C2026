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
                <!-- Usamos las minúsculas para Postgres -->
                <p class="destacado">{{ reporte.problemas?.nombreamigable }}</p>
              </div>

              <div class="info-item">
                <label>Descripción</label>
                <div class="descripcion-box">{{ reporte.descripcion }}</div>
              </div>

              <div class="info-item">
                <label>Ubicación</label>
                <p>{{ reporte.domicilio }}</p>
                <p v-if="reporte.referencias" class="referencias">Ref: {{ reporte.referencias }}</p>
              </div>

              <div class="info-grupo-doble">
                <div class="info-item">
                  <label>Ciudadano</label>
                  <p>{{ reporte.nombre }}</p>
                </div>
                <div class="info-item">
                  <label>Teléfono</label>
                  <p>{{ reporte.telefono }}</p>
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

          <button v-if="!esAdmin" class="btn-primario" @click="buscarReporte">
            Buscar Otro Reporte
          </button>

          <template v-if="esAdmin && reporte">
            <button
              v-if="reporte.estado === 'Llegado'"
              class="btn-primario"
              @click="$emit('asignar', reporte?.folio)"
            >
              Asignar Supervisor
            </button>

            <button
              v-if="reporte.estado === 'Finalizado'"
              class="btn-primario"
              @click="$emit('devolver', reporte?.folio, 'En Proceso')"
            >
              Devolver a En Proceso
            </button>

            <button
              v-if="reporte.estado === 'Rechazado'"
              class="btn-primario"
              @click="$emit('devolver', reporte?.folio, 'Llegado')"
            >
              Devolver a Llegado
            </button>

            <button
              v-if="reporte.estado !== 'Rechazado'"
              class="btn-peligroso"
              @click="$emit('rechazar', reporte?.folio)"
            >
              Rechazar Reporte
            </button>
          </template>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { formatearFechaLocal, obtenerClaseEstado } from '../logic/reporteDetalleModal'

const emit = defineEmits(['close', 'asignar', 'rechazar', 'buscar', 'devolver'])

const cerrar = () => {
  emit('close')
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
})

</script>

<style src="../assets/reporteDetalle.css"></style>