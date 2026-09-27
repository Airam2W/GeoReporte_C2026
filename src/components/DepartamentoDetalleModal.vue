<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card modal-usuario">
        <div class="modal-header">
          <div>
            <h3>Detalle del Departamento</h3>
            <p class="folio-text">ID: {{ departamento?.id }}</p>
          </div>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <div class="modal-body" v-if="departamento">
          <div class="info-columna">
            <div class="info-item">
              <label>Nombre del Departamento</label>
              <p class="destacado">{{ departamento.nombre }}</p>
            </div>

            <!-- Nombre Amigable solo si es Interno -->
            <div class="info-item" v-if="departamento.tipo === 'Interno'" style="margin-top: 16px">
              <label>Nombre Amigable</label>
              <p>{{ departamento.nombreamigable || 'No asignado' }}</p>
            </div>

            <div class="estado-actual-box" style="margin-top: 20px">
              <label>Tipo</label>
              <span
                :class="[
                  'badge badge-grande',
                  departamento.tipo === 'Interno' ? 'badge-azul' : 'badge-gris',
                ]"
              >
                {{ departamento.tipo }}
              </span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secundario" @click="cerrar">Cerrar</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

defineProps({
  visible: { type: Boolean, default: false },
  departamento: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const cerrar = () => {
  emit('close')
}
</script>

<style src="../assets/usuarioDetalle.css" />