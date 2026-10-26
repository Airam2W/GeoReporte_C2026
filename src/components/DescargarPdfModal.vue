<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card modal-pdf">
        <div class="modal-header">
          <div>
            <h3>Descargar ficha del reporte</h3>
            <p class="folio-text">Folio: #{{ folio }}</p>
          </div>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <div class="modal-body">
          <p class="pdf-mensaje">
            Se generará la ficha oficial del reporte en formato PDF, con los datos de atención y la
            evidencia registrada. Es un documento de uso interno del Ayuntamiento de Culiacán.
          </p>

          <div class="input-grupo">
            <label>Enviar copia al correo (opcional)</label>
            <input
              v-model="correo"
              type="email"
              placeholder="correo@ejemplo.com"
              :class="{ 'input-error': error }"
            />
            <span v-if="error" class="msg-error">{{ error }}</span>
          </div>
        </div>

        <div class="modal-footer pdf-footer">
          <button class="btn-secundario" type="button" :disabled="procesando" @click="cerrar">
            Cancelar
          </button>
          <button class="btn-secundario" type="button" :disabled="procesando" @click="$emit('descargar')">
            Solo descargar
          </button>
          <button class="btn-primario" type="button" :disabled="procesando" @click="enviar">
            {{ procesando ? 'Procesando...' : 'Descargar y enviar al correo' }}
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
  correoInicial: { type: String, default: '' },
  procesando: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'descargar', 'enviar'])

const correo = ref('')
const error = ref('')

watch(
  () => props.visible,
  (v) => {
    if (v) {
      correo.value = props.correoInicial
      error.value = ''
    }
  },
)

const cerrar = () => emit('close')

const enviar = () => {
  error.value = ''
  const valor = correo.value.trim()
  if (!valor) {
    error.value = 'Escribe un correo para enviar la copia'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
    error.value = 'Ingresa un correo válido'
    return
  }
  emit('enviar', valor)
}
</script>

<style src="../assets/usuarioForm.css" />

<style scoped>
.pdf-mensaje {
  margin: 0 0 16px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #555;
}
.btn-secundario:disabled,
.btn-primario:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 560px) {
  .pdf-footer { flex-direction: column-reverse; }
  .pdf-footer button { width: 100%; }
}
</style>