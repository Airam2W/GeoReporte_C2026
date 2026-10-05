<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ esEdicion ? 'Editar Departamento' : 'Agregar Departamento' }}</h3>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <form id="formDepartamento" class="modal-body form-grid" @submit.prevent="guardar">
          <div class="input-grupo">
            <label>Nombre del Departamento</label>
            <input
              name="nombre"
              v-model="form.nombre"
              type="text"
              :class="{ 'input-error': errores.nombre }"
            />
            <span v-if="errores.nombre" class="msg-error">{{ errores.nombre }}</span>
          </div>

          <div class="input-grupo">
            <label>Tipo</label>
            <select
              name="tipo"
              v-model="form.tipo"
              :class="{ 'input-error': errores.tipo }"
              :disabled="esEdicion"
            >
              <option value="">Seleccione un tipo...</option>
              <option value="Interno">Interno</option>
              <option value="Externo">Externo</option>
            </select>
            <span v-if="errores.tipo" class="msg-error">{{ errores.tipo }}</span>
            <span v-if="esEdicion" style="font-size: 0.8rem; color: #888; margin-top: 4px">
              El tipo no puede modificarse una vez creado el departamento.
            </span>
          </div>

          <!-- Nombre Amigable solo para Interno -->
          <div class="input-grupo" v-if="form.tipo === 'Interno'">
            <label>Nombre Amigable</label>
            <input
              name="nombreamigable"
              v-model="form.nombreamigable"
              type="text"
              :class="{ 'input-error': errores.nombreamigable }"
            />
            <span v-if="errores.nombreamigable" class="msg-error">{{
              errores.nombreamigable
            }}</span>
          </div>
        </form>

        <div class="modal-footer">
          <button class="btn-secundario" @click="cerrar">Cancelar</button>
          <button form="formDepartamento" type="submit" class="btn-primario">
            {{ esEdicion ? 'Actualizar' : 'Guardar Departamento' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue'
import Swal from 'sweetalert2'
import { selectIlike } from '../services/supabaseController'

const props = defineProps({
  visible: { type: Boolean, default: false },
  departamentoAEditar: { type: Object, default: null },
})

const emit = defineEmits(['close', 'save'])

const esEdicion = ref(false)
const errores = ref<Record<string, string>>({})
const form = ref({
  id: '',
  nombre: '',
  tipo: '',
  nombreamigable: '',
})

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      errores.value = {}
      if (props.departamentoAEditar) {
        esEdicion.value = true
        form.value = {
          id: props.departamentoAEditar.id,
          nombre: props.departamentoAEditar.nombre || '',
          tipo: props.departamentoAEditar.tipo || '',
          nombreamigable: props.departamentoAEditar.nombreamigable || '',
        }
      } else {
        esEdicion.value = false
        form.value = { id: '', nombre: '', tipo: '', nombreamigable: '' }
      }
    }
  },
)

const cerrar = () => emit('close')

const guardar = async () => {
  errores.value = {}
  let esValido = true

  if (!form.value.nombre.trim()) {
    errores.value.nombre = 'El nombre del departamento es obligatorio'
    esValido = false
  }

  if (!form.value.tipo) {
    errores.value.tipo = 'Selecciona un tipo'
    esValido = false
  }

  if (form.value.tipo === 'Interno' && !form.value.nombreamigable.trim()) {
    errores.value.nombreamigable = 'El nombre amigable es obligatorio para departamentos internos'
    esValido = false
  }

  if (!esValido) return

  // --- Validación de nombre duplicado contra AMBAS tablas ---
  const nombreNormalizado = form.value.nombre.trim()

  const [resInternos, resExternos] = await Promise.all([
    selectIlike('departamentos', 'nombre', nombreNormalizado, ['id', 'nombre']),
    selectIlike('departamentos_externos', 'departamento', nombreNormalizado, [
      'id',
      'departamento',
    ]),
  ])

  if (resInternos.error || resExternos.error) {
    console.error('Error al validar nombre duplicado:', resInternos.error || resExternos.error)
  } else {
    const duplicadoInterno = resInternos.data?.find(
      (d) => !(form.value.tipo === 'Interno' && String(d.id) === String(form.value.id)),
    )

    const duplicadoExterno = resExternos.data?.find(
      (d) => !(form.value.tipo === 'Externo' && String(d.id) === String(form.value.id)),
    )

    if (duplicadoInterno || duplicadoExterno) {
      errores.value.nombre = esEdicion.value
        ? 'No se puede modificar el departamento: ya existe otro departamento (interno o externo) con este nombre.'
        : 'No se puede crear el departamento: ya existe un departamento (interno o externo) con este nombre.'
      return
    }
  }

  const result = await Swal.fire({
    title: esEdicion.value ? '¿Actualizar departamento?' : '¿Agregar departamento?',
    html: `Estás a punto de ${esEdicion.value ? 'actualizar' : 'crear'} el departamento <b>${form.value.nombre}</b> (${form.value.tipo}).`,
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
