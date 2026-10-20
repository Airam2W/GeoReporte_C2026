<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3>Turnar Reporte</h3>
            <p class="folio-text">Folio: #{{ folio }}</p>
          </div>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <form id="formTurnar" class="modal-body form-grid" @submit.prevent="enviar">
          <div class="input-grupo">
            <label>Tipo de departamento</label>
            <select v-model="form.tipo" :class="{ 'input-error': errores.tipo }">
              <option value="">Seleccione un tipo...</option>
              <option value="Interno">Interno</option>
              <option value="Externo">Externo</option>
            </select>
            <span v-if="errores.tipo" class="msg-error">{{ errores.tipo }}</span>
          </div>

          <div class="input-grupo">
            <label>Departamento</label>
            <select
              v-model="form.departamento_id"
              :disabled="!form.tipo"
              :class="{ 'input-error': errores.departamento_id }"
            >
              <option value="">Seleccione un departamento...</option>
              <option v-for="d in departamentosDisponibles" :key="d.id" :value="d.id">
                {{ d.nombre }}
              </option>
            </select>
            <span v-if="errores.departamento_id" class="msg-error">{{
              errores.departamento_id
            }}</span>
          </div>

          <div class="input-grupo">
            <label>Problema</label>
            <select
              v-model="form.problema_id"
              :disabled="!form.departamento_id || cargandoOpciones"
              :class="{ 'input-error': errores.problema_id }"
            >
              <option value="">
                {{ cargandoOpciones ? 'Cargando...' : 'Seleccione un problema...' }}
              </option>
              <option v-for="p in problemas" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
            <span v-if="errores.problema_id" class="msg-error">{{ errores.problema_id }}</span>
          </div>

          <div class="input-grupo">
            <label>Administrador</label>
            <select
              v-model="form.administrador_id"
              :disabled="!form.departamento_id || cargandoOpciones"
              :class="{ 'input-error': errores.administrador_id }"
            >
              <option value="">
                {{ cargandoOpciones ? 'Cargando...' : 'Seleccione un administrador...' }}
              </option>
              <option v-for="a in administradores" :key="a.id" :value="a.id">
                {{ a.nombre }}
              </option>
            </select>
            <span v-if="errores.administrador_id" class="msg-error">{{
              errores.administrador_id
            }}</span>
          </div>
        </form>

        <div class="modal-footer">
          <button class="btn-secundario" type="button" @click="cerrar">Cancelar</button>
          <button form="formTurnar" type="submit" class="btn-primario" :disabled="guardando">
            {{ guardando ? 'Turnando...' : 'Turnar' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { obtenerProblematicasInternasPorID, obtenerProblematicasExternasPorID, obtenerAdministradoresInternosPorID, obtenerAdministradoresExternosPorID } from '../services/supabaseController'

const props = defineProps({
  visible: { type: Boolean, default: false },
  folio: { type: String, default: '' },
  departamentosInternos: { type: Array as () => any[], default: () => [] },
  departamentosExternos: { type: Array as () => any[], default: () => [] },
  guardando: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm'])

const form = ref({
  tipo: '' as '' | 'Interno' | 'Externo',
  departamento_id: '' as string | number,
  problema_id: '' as string | number,
  administrador_id: '' as string | number,
})
const errores = ref<Record<string, string>>({})
const problemas = ref<any[]>([])
const administradores = ref<any[]>([])
const cargandoOpciones = ref(false)

// Solo departamentos en Alta; normaliza internos/externos a { id, nombre }
const departamentosDisponibles = computed(() => {
  if (form.value.tipo === 'Interno') {
    return props.departamentosInternos
      .filter((d) => d.estado === 'Alta')
      .map((d) => ({ id: d.id, nombre: d.nombre }))
  }
  if (form.value.tipo === 'Externo') {
    return props.departamentosExternos
      .filter((d) => d.estado === 'Alta')
      .map((d) => ({ id: d.id, nombre: d.departamento }))
  }
  return []
})

const nombreCompleto = (u: any) =>
  `${u?.nombre || ''} ${u?.apellido_p || ''} ${u?.apellido_m || ''}`.trim()

watch(
  () => props.visible,
  (v) => {
    if (v) {
      form.value = { tipo: '', departamento_id: '', problema_id: '', administrador_id: '' }
      errores.value = {}
      problemas.value = []
      administradores.value = []
    }
  },
)

// Al cambiar el tipo, se reinicia todo lo dependiente
watch(
  () => form.value.tipo,
  () => {
    form.value.departamento_id = ''
    form.value.problema_id = ''
    form.value.administrador_id = ''
    problemas.value = []
    administradores.value = []
  },
)

// Al cambiar el departamento, se cargan sus problemas y administradores
watch(
  () => form.value.departamento_id,
  async (depId) => {
    form.value.problema_id = ''
    form.value.administrador_id = ''
    problemas.value = []
    administradores.value = []
    if (!depId) return

    cargandoOpciones.value = true
    const esInterno = form.value.tipo === 'Interno'

    const [resProblemas, resAdmins] = await Promise.all([
      esInterno ? obtenerProblematicasInternasPorID(depId) : obtenerProblematicasExternasPorID(depId),
      esInterno ? obtenerAdministradoresInternosPorID(depId) : obtenerAdministradoresExternosPorID(depId),
    ])

    if (resProblemas.error) console.error('Error al cargar problemas:', resProblemas.error.message)
    else problemas.value = (resProblemas.data || []).filter((p: any) => p.estado === 'Alta')

    if (resAdmins.error) console.error('Error al cargar administradores:', resAdmins.error.message)
    else
      administradores.value = (resAdmins.data || [])
        .filter((a: any) => a.usuarios?.estadoadministrativo === 'Alta')
        .map((a: any) => ({
          id: a.id,
          nombre: nombreCompleto(a.usuarios),
        }))

    cargandoOpciones.value = false
  },
)

const cerrar = () => emit('close')

const enviar = () => {
  errores.value = {}
  let ok = true
  if (!form.value.tipo) {
    errores.value.tipo = 'Selecciona un tipo'
    ok = false
  }
  if (!form.value.departamento_id) {
    errores.value.departamento_id = 'Selecciona un departamento'
    ok = false
  }
  if (!form.value.problema_id) {
    errores.value.problema_id = 'Selecciona un problema'
    ok = false
  }
  if (!form.value.administrador_id) {
    errores.value.administrador_id = 'Selecciona un administrador'
    ok = false
  }
  if (!ok) return

  emit('confirm', {
    tipo: form.value.tipo,
    departamento_id: form.value.departamento_id,
    problema_id: form.value.problema_id,
    administrador_id: form.value.administrador_id,
    departamentoNombre: departamentosDisponibles.value.find(
      (d) => d.id == form.value.departamento_id,
    )?.nombre,
    problemaNombre: problemas.value.find((p) => p.id == form.value.problema_id)?.nombre,
    administradorNombre: administradores.value.find((a) => a.id == form.value.administrador_id)
      ?.nombre,
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
