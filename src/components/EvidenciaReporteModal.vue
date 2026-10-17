<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3>{{ encabezado }}</h3>
            <p class="folio-text">Folio: #{{ folio }}</p>
          </div>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <form id="formEvidencia" class="modal-body form-grid" @submit.prevent="enviar">
          <!-- Título fijo (Finalizar) o select (Avance) -->
          <div class="input-grupo">
            <label>{{ tituloFijo ? 'Tipo de cierre' : 'Tipo de avance' }}</label>
            <input v-if="tituloFijo" type="text" :value="titulos[0]?.nombre || ''" disabled />
            <select v-else v-model="tituloId" :class="{ 'input-error': errores.titulo }">
              <option value="">Seleccione una opción...</option>
              <option v-for="t in titulos" :key="t.id" :value="t.id">{{ t.nombre }}</option>
            </select>
            <span v-if="errores.titulo" class="msg-error">{{ errores.titulo }}</span>
          </div>

          <div class="input-grupo">
            <label>Notas</label>
            <textarea
              v-model="notas"
              rows="4"
              placeholder="Describe lo realizado..."
              :class="{ 'input-error': errores.notas }"
            ></textarea>
            <span v-if="errores.notas" class="msg-error">{{ errores.notas }}</span>
          </div>

          <div class="input-grupo">
            <label>Evidencia fotográfica</label>
            <input
              ref="inputArchivo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="archivo-oculto"
              @change="elegirArchivo"
            />
            <button
              type="button"
              class="zona-foto"
              :class="{ 'input-error': errores.foto }"
              @click="inputArchivo?.click()"
            >
              <img v-if="vistaPrevia" :src="vistaPrevia" alt="Vista previa" />
              <span v-else>📷 Toca para subir una imagen<small>JPG, PNG o WEBP · máx. 5 MB</small></span>
            </button>
            <span v-if="errores.foto" class="msg-error">{{ errores.foto }}</span>
          </div>
        </form>

        <div class="modal-footer">
          <button class="btn-secundario" type="button" @click="cerrar">Cancelar</button>
          <button form="formEvidencia" type="submit" class="btn-primario" :disabled="guardando">
            {{ guardando ? 'Enviando...' : 'Enviar' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  folio: { type: String, default: '' },
  encabezado: { type: String, default: '' },
  titulos: { type: Array as () => any[], default: () => [] },
  tituloFijo: { type: Boolean, default: false }, // true = usa solo el primer título
  guardando: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const MAX_BYTES = 5 * 1024 * 1024
const tituloSeleccionado = ref<string | number>('')
const notas = ref('')
const archivo = ref<File | null>(null)
const vistaPrevia = ref('')
const errores = ref<Record<string, string>>({})
const inputArchivo = ref<HTMLInputElement | null>(null)

// Con título fijo, el id siempre es el del primero; si no, el elegido
const tituloId = computed({
  get: () => (props.tituloFijo ? props.titulos[0]?.id ?? '' : tituloSeleccionado.value),
  set: (v) => (tituloSeleccionado.value = v),
})

const limpiarVista = () => {
  if (vistaPrevia.value) URL.revokeObjectURL(vistaPrevia.value)
  vistaPrevia.value = ''
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      tituloSeleccionado.value = ''
      notas.value = ''
      archivo.value = null
      errores.value = {}
      limpiarVista()
      if (inputArchivo.value) inputArchivo.value.value = ''
    }
  },
)

onBeforeUnmount(limpiarVista)

const elegirArchivo = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  errores.value.foto = ''
  if (!f) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
    errores.value.foto = 'Formato no válido. Usa JPG, PNG o WEBP.'
    return
  }
  if (f.size > MAX_BYTES) {
    errores.value.foto = 'La imagen supera los 5 MB.'
    return
  }
  limpiarVista()
  archivo.value = f
  vistaPrevia.value = URL.createObjectURL(f)
}

const cerrar = () => emit('close')

const enviar = () => {
  errores.value = {}
  let ok = true
  if (!tituloId.value) {
    errores.value.titulo = props.tituloFijo
      ? 'No hay un título configurado para esta acción.'
      : 'Selecciona una opción'
    ok = false
  }
  if (!notas.value.trim()) { errores.value.notas = 'Las notas son obligatorias'; ok = false }
  if (!archivo.value) { errores.value.foto = 'La imagen es obligatoria'; ok = false }
  if (!ok) return

  emit('confirm', {
    titulo_id: tituloId.value,
    tituloNombre: props.titulos.find((t) => t.id == tituloId.value)?.nombre,
    notas: notas.value.trim(),
    archivo: archivo.value,
  })
}
</script>

<style src="../assets/usuarioForm.css" />
<style src="../assets/evidenciaReporteModal.css" />