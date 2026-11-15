<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3>Modificar Prioridad</h3>
            <p class="folio-text">Folio: #{{ folio }}</p>
          </div>
          <button class="btn-cerrar" :disabled="guardando" @click="cerrar">✕</button>
        </div>

        <form id="formPrioridad" class="modal-body form-grid" @submit.prevent="enviar">
          <div class="input-grupo">
            <label>Problemática del reporte</label>
            <input type="text" :value="problema" disabled />
          </div>

          <div class="input-grupo">
            <label>Prioridad actual</label>
            <input type="text" :value="textoPrioridad(prioridadActual)" disabled />
          </div>

          <div class="input-grupo">
            <label>Nueva prioridad</label>
            <select v-model="prioridad" :class="{ 'input-error': error }">
              <option value="">Seleccione una prioridad...</option>
              <option v-for="p in PRIORIDADES" :key="p.valor" :value="p.valor">
                {{ p.etiqueta }}
              </option>
            </select>
            <span v-if="error" class="msg-error">{{ error }}</span>
          </div>
        </form>

        <div class="modal-footer">
          <button class="btn-secundario" type="button" :disabled="guardando" @click="cerrar">
            Cancelar
          </button>
          <button form="formPrioridad" type="submit" class="btn-primario" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const PRIORIDADES = [
  { valor: 1, etiqueta: 'Muy Alta' },
  { valor: 2, etiqueta: 'Alta' },
  { valor: 3, etiqueta: 'Media' },
  { valor: 4, etiqueta: 'Baja' },
  { valor: 5, etiqueta: 'Muy Baja' },
]

const props = defineProps({
  visible: { type: Boolean, default: false },
  folio: { type: String, default: '' },
  problema: { type: String, default: '' },
  prioridadActual: { type: [Number, String, null], default: null },
  guardando: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const prioridad = ref<number | ''>('')
const error = ref('')

const textoPrioridad = (valor: number | string | null) =>
  PRIORIDADES.find((p) => p.valor === Number(valor))?.etiqueta || 'Sin definir'

watch(
  () => props.visible,
  (v) => {
    if (v) {
      prioridad.value = ''
      error.value = ''
    }
  },
)

const cerrar = () => {
  if (!props.guardando) emit('close')
}

const enviar = () => {
  error.value = ''
  if (!prioridad.value) {
    error.value = 'Selecciona una prioridad'
    return
  }
  if (Number(prioridad.value) === Number(props.prioridadActual)) {
    error.value = 'Selecciona una prioridad distinta a la actual'
    return
  }
  emit('confirm', Number(prioridad.value))
}
</script>

<style src="../assets/usuarioForm.css" />

<style scoped>
.btn-secundario:disabled,
.btn-primario:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 480px) {
  .modal-footer { flex-direction: column-reverse; }
  .modal-footer button { width: 100%; }
}
</style>