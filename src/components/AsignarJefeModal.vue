<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3>Asignar Jefe</h3>
            <p class="folio-text">Folio: #{{ folio }}</p>
          </div>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <form id="formAsignarJefe" class="modal-body form-grid" @submit.prevent="enviar">
          <div class="input-grupo">
            <label>Problemática del reporte</label>
            <input type="text" :value="problema" disabled />
          </div>

          <div class="input-grupo">
            <label>Jefe</label>
            <select v-model="jefeId" :class="{ 'input-error': error }">
              <option value="">Seleccione un jefe...</option>
              <option v-for="j in jefes" :key="j.id" :value="j.id">{{ j.nombre }}</option>
            </select>
            <span v-if="error" class="msg-error">{{ error }}</span>
            <span
              v-if="!jefes.length"
              style="font-size: 0.8rem; color: #888; margin-top: 4px"
            >
              No tienes jefes disponibles (en Alta) a tu cargo.
            </span>
          </div>
        </form>

        <div class="modal-footer">
          <button class="btn-secundario" type="button" @click="cerrar">Cancelar</button>
          <button form="formAsignarJefe" type="submit" class="btn-primario" :disabled="guardando">
            {{ guardando ? 'Asignando...' : 'Asignar' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  folio: { type: String, default: '' },
  problema: { type: String, default: '' },
  jefes: { type: Array as () => any[], default: () => [] },
  guardando: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm'])

const jefeId = ref<string | number>('')
const error = ref('')

watch(
  () => props.visible,
  (v) => {
    if (v) {
      jefeId.value = ''
      error.value = ''
    }
  },
)

const cerrar = () => emit('close')

const enviar = () => {
  error.value = ''
  if (!jefeId.value) {
    error.value = 'Selecciona un jefe'
    return
  }
  emit('confirm', {
    jefe_id: jefeId.value,
    jefeNombre: props.jefes.find((j) => j.id == jefeId.value)?.nombre,
  })
}
</script>

<style src="../assets/usuarioForm.css" />