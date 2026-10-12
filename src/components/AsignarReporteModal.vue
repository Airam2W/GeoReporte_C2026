<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3>Asignar Supervisor</h3>
            <p class="folio-text">Folio: #{{ folio }}</p>
          </div>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <form id="formAsignar" class="modal-body form-grid" @submit.prevent="enviar">
          <div class="input-grupo">
            <label>Departamento</label>
            <input type="text" :value="departamentoNombre" disabled />
          </div>

          <div class="input-grupo">
            <label>Supervisor</label>
            <select v-model="supervisorId" :class="{ 'input-error': error }">
              <option value="">Seleccione un supervisor...</option>
              <option v-for="s in supervisores" :key="s.id" :value="s.id">
                {{ s.nombre }}
              </option>
            </select>
            <span v-if="error" class="msg-error">{{ error }}</span>
            <span
              v-if="!supervisores.length"
              style="font-size: 0.8rem; color: #888; margin-top: 4px"
            >
              No hay supervisores disponibles en este departamento.
            </span>
          </div>
        </form>

        <div class="modal-footer">
          <button class="btn-secundario" type="button" @click="cerrar">Cancelar</button>
          <button form="formAsignar" type="submit" class="btn-primario" :disabled="guardando">
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
  departamentoNombre: { type: String, default: '' },
  supervisores: { type: Array as () => any[], default: () => [] },
  guardando: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm'])

const supervisorId = ref<string | number>('')
const error = ref('')

watch(
  () => props.visible,
  (v) => {
    if (v) {
      supervisorId.value = ''
      error.value = ''
    }
  },
)

const cerrar = () => emit('close')

const enviar = () => {
  error.value = ''
  if (!supervisorId.value) {
    error.value = 'Selecciona un supervisor'
    return
  }
  emit('confirm', {
    supervisor_id: supervisorId.value,
    supervisorNombre: props.supervisores.find((s) => s.id == supervisorId.value)?.nombre,
  })
}
</script>

<style src="../assets/usuarioForm.css" />

<style>
/* Para que la confirmación de Swal quede por encima del modal */
.swal2-container {
  z-index: 10000 !important;
}
</style>