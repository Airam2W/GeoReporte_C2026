<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card modal-usuario">
        <div class="modal-header">
          <div>
            <h3>Detalle de la Problemática</h3>
            <p class="folio-text">ID: {{ problematica?.id }}</p>
          </div>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <div class="modal-body" v-if="problematica">
          <div class="info-columna">
            <div class="info-item">
              <label>Nombre</label>
              <p class="destacado">{{ problematica.nombre }}</p>
            </div>

            <div class="info-item" style="margin-top: 16px">
              <label>Nombre Amigable</label>
              <p>{{ problematica.nombreamigable || 'No asignado' }}</p>
            </div>

            <div class="info-item" style="margin-top: 16px">
              <label>Departamento</label>
              <p>{{ problematica.departamentoNombre || 'No asignado' }}</p>
            </div>

            <div class="estado-actual-box" style="margin-top: 20px">
              <label>Tipo</label>
              <span
                :class="[
                  'badge badge-grande',
                  problematica.tipo === 'Interno' ? 'badge-azul' : 'badge-gris',
                ]"
              >
                {{ problematica.tipo }}
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
  problematica: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const cerrar = () => {
  emit('close')
}
</script>

<style src="../assets/usuarioDetalle.css" />