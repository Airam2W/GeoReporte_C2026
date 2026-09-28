<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ esEdicion ? 'Editar Problemática' : 'Agregar Problemática' }}</h3>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <form id="formProblematica" class="modal-body form-grid" @submit.prevent="guardar">
          <div class="input-grupo">
            <label>Nombre de la Problemática</label>
            <input
              name="nombre"
              v-model="form.nombre"
              type="text"
              :class="{ 'input-error': errores.nombre }"
            />
            <span v-if="errores.nombre" class="msg-error">{{ errores.nombre }}</span>
          </div>

          <div class="input-grupo">
            <label>Nombre Amigable</label>
            <input
              name="nombreamigable"
              v-model="form.nombreamigable"
              type="text"
              :class="{ 'input-error': errores.nombreamigable }"
            />
            <span v-if="errores.nombreamigable" class="msg-error">{{ errores.nombreamigable }}</span>
          </div>

          <div class="input-grupo">
            <label>Tipo</label>
            <select
              name="tipo"
              v-model="form.tipo"
              :class="{ 'input-error': errores.tipo }"
              :disabled="esEdicion"
              @change="form.departamento_id = ''"
            >
              <option value="">Seleccione un tipo...</option>
              <option value="Interno">Interno</option>
              <option value="Externo">Externo</option>
            </select>
            <span v-if="errores.tipo" class="msg-error">{{ errores.tipo }}</span>
            <span v-if="esEdicion" style="font-size: 0.8rem; color: #888; margin-top: 4px">
              El tipo no puede modificarse una vez creada la problemática.
            </span>
          </div>

          <!-- Departamento Interno -->
          <div class="input-grupo" v-if="form.tipo === 'Interno'">
            <label>Departamento</label>
            <select
              v-model="form.departamento_id"
              :class="{ 'input-error': errores.departamento_id }"
            >
              <option value="">Seleccione...</option>
              <option v-for="dep in departamentos.filter(d => d.estado === 'Alta')" :key="dep.id" :value="dep.id">
                {{ dep.nombre }}
              </option>
            </select>
            <span v-if="errores.departamento_id" class="msg-error">{{ errores.departamento_id }}</span>
          </div>

          <!-- Departamento Externo -->
          <div class="input-grupo" v-if="form.tipo === 'Externo'">
            <label>Departamento Externo</label>
            <select
              v-model="form.departamento_id"
              :class="{ 'input-error': errores.departamento_id }"
            >
              <option value="">Seleccione...</option>
              <option v-for="dep in departamentosExternos.filter(d => d.estado === 'Alta')" :key="dep.id" :value="dep.id">
                {{ dep.departamento }}
              </option>
            </select>
            <span v-if="errores.departamento_id" class="msg-error">{{ errores.departamento_id }}</span>
          </div>
        </form>

        <div class="modal-footer">
          <button class="btn-secundario" @click="cerrar">Cancelar</button>
          <button form="formProblematica" type="submit" class="btn-primario">
            {{ esEdicion ? 'Actualizar' : 'Guardar Problemática' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue'
import Swal from 'sweetalert2'

const props = defineProps({
  visible: { type: Boolean, default: false },
  problematicaAEditar: { type: Object, default: null },
  departamentos: { type: Array, default: () => [] },
  departamentosExternos: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'save'])

const esEdicion = ref(false)
const errores = ref<Record<string, string>>({})
const form = ref({
  id: '',
  nombre: '',
  nombreamigable: '',
  tipo: '',
  departamento_id: '',
})

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      errores.value = {}
      if (props.problematicaAEditar) {
        esEdicion.value = true
        form.value = {
          id: props.problematicaAEditar.id,
          nombre: props.problematicaAEditar.nombre || '',
          nombreamigable: props.problematicaAEditar.nombreamigable || '',
          tipo: props.problematicaAEditar.tipo || '',
          departamento_id: props.problematicaAEditar.departamento_id || '',
        }
      } else {
        esEdicion.value = false
        form.value = { id: '', nombre: '', nombreamigable: '', tipo: '', departamento_id: '' }
      }
    }
  },
)

const cerrar = () => emit('close')

const guardar = async () => {
  errores.value = {}
  let esValido = true

  if (!form.value.nombre.trim()) {
    errores.value.nombre = 'El nombre es obligatorio'
    esValido = false
  }

  if (!form.value.nombreamigable.trim()) {
    errores.value.nombreamigable = 'El nombre amigable es obligatorio'
    esValido = false
  }

  if (!form.value.tipo) {
    errores.value.tipo = 'Selecciona un tipo'
    esValido = false
  }

  if (!form.value.departamento_id) {
    errores.value.departamento_id = 'Selecciona un departamento'
    esValido = false
  }

  if (!esValido) return

  const result = await Swal.fire({
    title: esEdicion.value ? '¿Actualizar problemática?' : '¿Agregar problemática?',
    html: `Estás a punto de ${esEdicion.value ? 'actualizar' : 'crear'} la problemática <b>${form.value.nombre}</b> (${form.value.tipo}).`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#1a6b2f',
    cancelButtonColor: '#888',
    confirmButtonText: esEdicion.value ? 'Sí, actualizar' : 'Sí, agregar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
  })

  if (!result.isConfirmed) return

  emit('save', form.value, esEdicion.value)
}
</script>

<style src="../assets/usuarioForm.css" />