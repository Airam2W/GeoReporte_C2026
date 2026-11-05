<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3>Retroalimentación de la imagen (IA)</h3>
            <p class="folio-text">Folio: #{{ folio }}</p>
          </div>
          <button class="btn-cerrar" :disabled="guardando" @click="cerrar">✕</button>
        </div>

        <div class="modal-body form-grid">
          <p class="intro">
            Para continuar, evalúa la evidencia fotográfica del reporte. Tus respuestas ayudan a
            mejorar la clasificación automática de reportes.
          </p>

          <div class="foto-box">
            <a v-if="fotoUrl" :href="fotoUrl" target="_blank" rel="noopener">
              <img :src="fotoUrl" alt="Evidencia del reporte" />
            </a>
            <span v-else class="sin-foto">Sin imagen</span>
          </div>

          <!-- Pregunta 1: calidad de la foto -->
          <fieldset class="pregunta" :class="{ 'pregunta-error': errores.buena }">
            <legend>
              ¿La imagen es adecuada y permite identificar claramente la problemática reportada?
            </legend>

            <div class="opciones">
              <label class="opcion" :class="{ activa: buena === 'si' }">
                <input v-model="buena" type="radio" name="foto-buena" value="si" />
                <span>Sí</span>
              </label>
              <label class="opcion" :class="{ activa: buena === 'no' }">
                <input v-model="buena" type="radio" name="foto-buena" value="no" />
                <span>No</span>
              </label>
            </div>
            <span v-if="errores.buena" class="msg-error">{{ errores.buena }}</span>
          </fieldset>

          <!-- Pregunta 2: solo si la foto es buena -->
          <fieldset
            v-if="buena === 'si'"
            class="pregunta"
            :class="{ 'pregunta-error': errores.respuesta }"
          >
            <legend>
              ¿La imagen corresponde a una problemática del departamento
              <strong>{{ departamentoNombre }}</strong>?
            </legend>

            <div class="opciones">
              <label class="opcion" :class="{ activa: respuesta === 'si' }">
                <input v-model="respuesta" type="radio" name="foto-dep" value="si" />
                <span>Sí</span>
              </label>
              <label class="opcion" :class="{ activa: respuesta === 'no' }">
                <input v-model="respuesta" type="radio" name="foto-dep" value="no" />
                <span>No</span>
              </label>
            </div>
            <span v-if="errores.respuesta" class="msg-error">{{ errores.respuesta }}</span>
          </fieldset>

          <!-- Select: solo si la foto es buena y no es de su departamento -->
          <div v-if="buena === 'si' && respuesta === 'no'" class="input-grupo">
            <label>¿A qué departamento corresponde la imagen?</label>
            <select v-model="departamentoElegido" :class="{ 'input-error': errores.departamento }">
              <option value="">Seleccione un departamento...</option>
              <option v-for="d in departamentos" :key="d.id" :value="d.id">{{ d.nombre }}</option>
              <option :value="-1">Departamento Externo</option>
            </select>
            <span v-if="errores.departamento" class="msg-error">{{ errores.departamento }}</span>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secundario" type="button" :disabled="guardando" @click="cerrar">
            Cancelar
          </button>
          <button class="btn-primario" type="button" :disabled="guardando" @click="enviar">
            {{ guardando ? 'Enviando...' : 'Enviar' }}
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
  fotoUrl: { type: String, default: '' },
  departamentoNombre: { type: String, default: '' },
  // Departamentos internos, sin el del supervisor: [{ id, nombre }]
  departamentos: { type: Array as () => any[], default: () => [] },
  guardando: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const buena = ref<'' | 'si' | 'no'>('')
const respuesta = ref<'' | 'si' | 'no'>('')
const departamentoElegido = ref<string | number>('')
const errores = ref<Record<string, string>>({})

watch(
  () => props.visible,
  (v) => {
    if (v) {
      buena.value = ''
      respuesta.value = ''
      departamentoElegido.value = ''
      errores.value = {}
    }
  },
)

// Si la foto no es buena, se descartan las respuestas de la segunda pregunta
watch(buena, (b) => {
  if (b !== 'si') {
    respuesta.value = ''
    departamentoElegido.value = ''
  }
})

// Si es de su departamento, se descarta el departamento elegido
watch(respuesta, (r) => {
  if (r !== 'no') departamentoElegido.value = ''
})

const cerrar = () => {
  if (!props.guardando) emit('close')
}

const enviar = () => {
  errores.value = {}

  if (!buena.value) {
    errores.value.buena = 'Selecciona una opción'
    return
  }

  // Foto no buena -> -2 directamente
  if (buena.value === 'no') {
    emit('confirm', -2)
    return
  }

  if (!respuesta.value) {
    errores.value.respuesta = 'Selecciona una opción'
    return
  }
  if (respuesta.value === 'no' && departamentoElegido.value === '') {
    errores.value.departamento = 'Selecciona un departamento'
    return
  }

  // "Sí" -> null (el panel usa el departamento del supervisor); si no, el id o -1 (externo)
  emit('confirm', respuesta.value === 'si' ? null : Number(departamentoElegido.value))
}
</script>

<style src="../assets/usuarioForm.css" />

<style scoped>
.intro { margin: 0; font-size: 0.92rem; line-height: 1.5; color: #555; }

.foto-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 10px;
  overflow: hidden;
}
.foto-box img { display: block; width: 100%; max-height: 280px; object-fit: contain; }
.sin-foto { color: #aaa; font-style: italic; padding: 24px; }

.pregunta {
  margin: 0;
  padding: 14px;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
}
.pregunta legend { padding: 0 6px; font-size: 0.95rem; color: #333; }
.pregunta-error { border-color: #e74c3c; }

.opciones { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
.opcion {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-weight: 600;
  color: #555;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s, color 0.2s;
}
.opcion:hover { border-color: #621132; }
.opcion.activa { border-color: #621132; background: #f5e9ee; color: #621132; }
.opcion input { accent-color: #621132; }

.btn-secundario:disabled,
.btn-primario:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 480px) {
  .modal-footer { flex-direction: column-reverse; }
  .modal-footer button { width: 100%; }
}
</style>