<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ esEdicion ? 'Editar Usuario' : 'Crear Nuevo Usuario' }}</h3>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <form id="formUsuario" class="modal-body form-grid" @submit.prevent="guardar">
          <div class="input-grupo">
            <label>Nombre(s)</label>
            <input
              name="nombre"
              v-model="form.nombre"
              type="text"
              :class="{ 'input-error': errores.nombre }"
            />
            <span v-if="errores.nombre" class="msg-error">{{ errores.nombre }}</span>
          </div>

          <div class="input-grupo-doble">
            <div class="input-grupo">
              <label>Apellido Paterno</label>
              <input
                name="apellido_p"
                v-model="form.apellido_p"
                type="text"
                :class="{ 'input-error': errores.apellido_p }"
              />
              <span v-if="errores.apellido_p" class="msg-error">{{ errores.apellido_p }}</span>
            </div>
            <div class="input-grupo">
              <label>Apellido Materno <span style="font-weight: 400; color: #888;">(Opcional)</span></label>
              <input name="apellido_m" v-model="form.apellido_m" type="text" />
            </div>
          </div>

          <div class="input-grupo">
            <label>Correo Electrónico</label>
            <input
              name="correo"
              v-model="form.correo"
              type="email"
              :class="{ 'input-error': errores.correo }"
            />
            <span v-if="errores.correo" class="msg-error">{{ errores.correo }}</span>
          </div>

          <div class="input-grupo">
            <label>Contraseña {{ esEdicion ? '(Opcional)' : '' }}</label>
            <input
              v-model="form.contrasena"
              name="contrasena"
              type="password"
              :placeholder="esEdicion ? 'Dejar en blanco para mantener la actual' : 'Mínimo 6 caracteres'"
              :class="{ 'input-error': errores.contrasena }"
            />
            <span v-if="errores.contrasena" class="msg-error">{{ errores.contrasena }}</span>
          </div>

          <div class="input-grupo-doble">
            <div class="input-grupo">
              <label>Tipo de Usuario</label>
              <select
                name="rol"
                v-model="form.tipousuario_id"
                :class="{ 'input-error': errores.tipousuario_id }"
                @change="validarDepartamento"
              >
                <option value="">Seleccione un rol...</option>
                <option v-for="rol in roles" :key="rol.id" :value="rol.id">{{ rol.nombre }}</option>
              </select>
              <span v-if="errores.tipousuario_id" class="msg-error">{{ errores.tipousuario_id }}</span>
            </div>

            <div class="input-grupo" v-if="form.tipousuario_id == 2 || form.tipousuario_id == 3">
              <label>Departamento</label>
              <select
                name="departamento"
                v-model="form.departamento_id"
                :class="{ 'input-error': errores.departamento_id }"
              >
                <option value="">Seleccione...</option>
                <option v-for="dep in departamentos" :key="dep.id" :value="dep.id">{{ dep.nombre }}</option>
              </select>
              <span v-if="errores.departamento_id" class="msg-error">{{ errores.departamento_id }}</span>
            </div>
          </div>

        </form>
        <div class="modal-footer">
          <button class="btn-secundario" @click="cerrar">Cancelar</button>
          <button form="formUsuario" type="submit" class="btn-primario" @click="guardar">{{ esEdicion ? 'Actualizar' : 'Guardar Usuario' }}</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  usuarioAEditar: { type: Object, default: null },
  roles: { type: Array, default: () => [] },
  departamentos: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'save'])

const esEdicion = ref(false)
const errores = ref<Record<string, string>>({})
const form = ref({
  id: '', nombre: '', apellido_p: '', apellido_m: '',
  correo: '', contrasena: '', tipousuario_id: '', departamento_id: ''
})

watch(() => props.visible, (newVal) => {
  if (newVal) {
    errores.value = {} // Limpiar errores al abrir
    if (props.usuarioAEditar) {
      esEdicion.value = true
      form.value = {
        ...props.usuarioAEditar,
        contrasena: '',
        tipousuario_id: props.usuarioAEditar.tipousuario_id || '',
        departamento_id: props.usuarioAEditar.departamento_id || ''
      }
    } else {
      esEdicion.value = false
      form.value = { id: '', nombre: '', apellido_p: '', apellido_m: '', correo: '', contrasena: '', tipousuario_id: '', departamento_id: '' }
    }
  }
})

const cerrar = () => emit('close')

const validarDepartamento = () => {
  if (form.value.tipousuario_id != 2 && form.value.tipousuario_id != 3) {
    form.value.departamento_id = ''
    errores.value.departamento_id = ''
  }
}

const guardar = () => {
  errores.value = {}
  let esValido = true

  if (!form.value.nombre.trim()) {
    errores.value.nombre = 'El nombre es obligatorio'
    esValido = false
  }

  if (!form.value.apellido_p.trim()) {
    errores.value.apellido_p = 'El apellido paterno es obligatorio'
    esValido = false
  }

  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.value.correo.trim()) {
    errores.value.correo = 'El correo es obligatorio'
    esValido = false
  } else if (!regexEmail.test(form.value.correo)) {
    errores.value.correo = 'Ingresa un correo válido'
    esValido = false
  }

  if (!esEdicion.value && !form.value.contrasena) {
    errores.value.contrasena = 'La contraseña es obligatoria'
    esValido = false
  } else if (form.value.contrasena && form.value.contrasena.length < 6) {
    errores.value.contrasena = 'La contraseña debe tener al menos 6 caracteres'
    esValido = false
  }

  if (!form.value.tipousuario_id) {
    errores.value.tipousuario_id = 'Selecciona un rol'
    esValido = false
  }

  if ((form.value.tipousuario_id == 2 || form.value.tipousuario_id == 3) && !form.value.departamento_id) {
    errores.value.departamento_id = 'El departamento es obligatorio para este rol'
    esValido = false
  }

  if (!esValido) return

  emit('save', form.value, esEdicion.value)
}
</script>

<style src="../assets/usuarioForm.css"/>
