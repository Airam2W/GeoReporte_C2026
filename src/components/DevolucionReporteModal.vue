<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3>Devolver Reporte</h3>
            <p class="folio-text">Folio: #{{ folio }}</p>
          </div>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <form id="formDevolucion" class="modal-body form-grid" @submit.prevent="enviar">
          <div class="input-grupo">
            <label>Motivo de la devolución</label>
            <select v-model="form.titulo_id" :class="{ 'input-error': errores.titulo_id }">
              <option value="">Seleccione un motivo...</option>
              <option v-for="t in titulos" :key="t.id" :value="t.id">{{ t.nombre }}</option>
            </select>
            <span v-if="errores.titulo_id" class="msg-error">{{ errores.titulo_id }}</span>
          </div>

          <div class="input-grupo">
            <label>Notas</label>
            <textarea
              v-model="form.notas"
              rows="5"
              placeholder="Describe el motivo de la devolución..."
              :class="{ 'input-error': errores.notas }"
            ></textarea>
            <span v-if="errores.notas" class="msg-error">{{ errores.notas }}</span>
          </div>
        </form>

        <div class="modal-footer">
          <button class="btn-secundario" type="button" @click="cerrar">Cancelar</button>
          <button form="formDevolucion" type="submit" class="btn-primario" :disabled="guardando">
            {{ guardando ? 'Devolviendo...' : 'Devolver Reporte' }}
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
  titulos: { type: Array as () => any[], default: () => [] },
  guardando: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm'])

const form = ref({ titulo_id: '' as string | number, notas: '' })
const errores = ref<Record<string, string>>({})

watch(
  () => props.visible,
  (v) => {
    if (v) {
      form.value = { titulo_id: '', notas: '' }
      errores.value = {}
    }
  },
)

const cerrar = () => emit('close')

const enviar = () => {
  errores.value = {}
  let ok = true

  if (!form.value.titulo_id) {
    errores.value.titulo_id = 'Selecciona un motivo'
    ok = false
  }
  if (!form.value.notas.trim()) {
    errores.value.notas = 'Las notas son obligatorias'
    ok = false
  }
  if (!ok) return

  emit('confirm', { titulo_id: form.value.titulo_id, notas: form.value.notas.trim() })
}
</script>

<style src="../assets/usuarioForm.css" />

<style>
/* Para que la confirmación de Swal se vea por encima del modal */
.swal2-container {
  z-index: 10000 !important;
}
</style>

<style scoped>
textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
  outline: none;
}
textarea:focus {
  border-color: #1a6b2f;
}
</style>