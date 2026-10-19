<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3>Finalizar Reporte</h3>
            <p class="folio-text">Folio: #{{ folio }}</p>
          </div>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <div class="modal-body form-grid">
          <div class="input-grupo">
            <label>Tipo de solicitud</label>
            <input type="text" :value="categoriaNombre" disabled />
          </div>

          <div class="input-grupo">
            <label>Notas</label>
            <textarea v-model="notas" rows="4" placeholder="Notas de la finalización..."></textarea>
          </div>

          <div class="input-grupo">
            <label>Evidencia fotográfica</label>
            <div class="foto-box">
              <a v-if="fotoUrl" :href="fotoUrl" target="_blank" rel="noopener">
                <img :src="fotoUrl" alt="Evidencia de finalización" />
              </a>
              <span v-else class="sin-foto">Sin imagen</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secundario" type="button" :disabled="guardando" @click="cerrar">
            Cancelar
          </button>
          <button class="btn-peligroso" type="button" :disabled="guardando" @click="$emit('denegar', notas.trim())">
            Denegar
          </button>
          <button class="btn-primario" type="button" :disabled="guardando" @click="$emit('aceptar', notas.trim())">
            {{ guardando ? 'Procesando...' : 'Aceptar' }}
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
  categoriaNombre: { type: String, default: '' },
  notasIniciales: { type: String, default: '' },
  fotoUrl: { type: String, default: '' },
  guardando: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'aceptar', 'denegar'])

const notas = ref('')

// Cada vez que se abre, se precargan las notas que escribió el jefe
watch(
  () => props.visible,
  (v) => {
    if (v) notas.value = props.notasIniciales
  },
)

const cerrar = () => emit('close')
</script>

<style src="../assets/usuarioForm.css" />
<style src="../assets/finalizarReporteModal.css"/>