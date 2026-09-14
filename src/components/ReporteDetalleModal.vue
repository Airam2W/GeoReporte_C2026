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
import { defineProps, defineEmits } from 'vue'

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

const emit = defineEmits(['close', 'asignar', 'rechazar', 'buscar', 'devolver'])

const cerrar = () => {
  emit('close')
}

const buscarReporte = () => {
  emit('buscar')
}

const obtenerClaseEstado = (estado: string) => {
  const clases: Record<string, string> = {
    llegado: 'badge-azul',
    'en proceso': 'badge-amarillo',
    finalizado: 'badge-verde',
    rechazado: 'badge-rojo',
  }
  return clases[estado] || 'badge-gris'
}

const formatearFechaLocal = (fechaString: string) => {
  if (!fechaString) return ''
  const fechaUtc = fechaString.endsWith('Z') ? fechaString : `${fechaString}Z`
  return new Date(fechaUtc).toLocaleString('es-MX')
}
</script>

<style scoped>
/* ==========================================
   DISEÑO DEL MODAL (Migrado desde Dashboard)
========================================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}
.modal-card {
  background: white;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  text-align: left;
}
.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafafa;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.4rem;
  color: #1a6b2f;
}
.folio-text {
  margin: 4px 0 0;
  color: #666;
  font-family: monospace;
  font-size: 0.9rem;
}
.btn-cerrar {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #aaa;
  cursor: pointer;
}
.btn-cerrar:hover {
  color: #333;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}
.modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.info-columna {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  color: #1a6b2f;
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
.referencias {
  font-size: 0.85rem !important;
  color: #666 !important;
  margin-top: 4px !important;
  font-style: italic;
}
.info-grupo-doble {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.foto-columna {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.foto-columna label {
  display: block;
  font-size: 0.8rem;
  color: #777;
  text-transform: uppercase;
  font-weight: 600;
}
.foto-contenedor {
  width: 100%;
  aspect-ratio: 4/3;
  background: #eee;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.foto-contenedor img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sin-foto {
  color: #aaa;
  font-style: italic;
}

.estado-actual-box {
  background: #f9f9f9;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  border: 1px solid #eee;
}
.estado-actual-box label {
  margin-bottom: 8px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #fafafa;
}
.btn-secundario,
.btn-primario,
.btn-peligroso {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: 0.2s;
}
.btn-secundario {
  background: #e0e0e0;
  color: #333;
}
.btn-secundario:hover {
  background: #d0d0d0;
}
.btn-primario {
  background: #1a6b2f;
  color: white;
}
.btn-primario:hover {
  background: #145524;
}
.btn-peligroso {
  background: #c62828;
  color: white;
}
.btn-peligroso:hover {
  background: #b71c1c;
}

/* Badges */
.badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-block;
}
.badge-grande {
  padding: 8px 16px;
  font-size: 1rem;
}
.badge-azul {
  background: #e3f2fd;
  color: #1976d2;
}
.badge-amarillo {
  background: #fff8e1;
  color: #f57f17;
}
.badge-verde {
  background: #e8f5e9;
  color: #2e7d32;
}
.badge-rojo {
  background: #ffebee;
  color: #c62828;
}
.badge-gris {
  background: #f5f5f5;
  color: #616161;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .modal-grid {
    grid-template-columns: 1fr;
  }
  .info-grupo-doble {
    grid-template-columns: 1fr;
  }
}
</style>
