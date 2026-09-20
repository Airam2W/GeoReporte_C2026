<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay" @click.self="cerrar">
      <div class="modal-card modal-usuario">

        <div class="modal-header">
          <div>
            <h3>Detalles del Personal</h3>
            <p class="folio-text">ID: {{ usuario?.id }}</p>
          </div>
          <button class="btn-cerrar" @click="cerrar">✕</button>
        </div>

        <div class="modal-body" v-if="usuario">
          <div class="info-columna">
            <div class="info-item">
              <label>Nombre Completo</label>
              <p class="destacado">{{ usuario.nombre }} {{ usuario.apellido_p }} {{ usuario.apellido_m }}</p>
            </div>

            <div class="info-grupo-doble">
              <div class="info-item">
                <label>Correo Electrónico</label>
                <p>{{ usuario.correo }}</p>
              </div>
              <div class="info-item">
                <label>Tipo de Usuario</label>
                <p>{{ usuario.tipoUsuario?.nombre || 'No asignado' }}</p>
              </div>
            </div>

            <div class="estado-actual-box" style="margin-top: 20px;">
              <label>Estado Administrativo</label>
              <span :class="['badge badge-grande', usuario.estadoadministrativo === 'Alta' ? 'badge-verde' : 'badge-rojo']">
                {{ usuario.estadoadministrativo }}
              </span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secundario" @click="cerrar">Cerrar</button>

          <!-- Botón dinámico según el estado -->
          <button
            v-if="usuario?.estadoadministrativo === 'Alta'"
            class="btn-primario" style="background-color: #c62828;"
            @click="$emit('cambiarEstado', usuario, 'Baja')"
          >
            Dar de Baja
          </button>

          <button
            v-else
            class="btn-primario" style="background-color: #2e7d32;"
            @click="$emit('cambiarEstado', usuario, 'Alta')"
          >
            Dar de Alta
          </button>
        </div>

      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

defineProps({
  visible: { type: Boolean, default: false },
  usuario: { type: Object, default: null }
})

const emit = defineEmits(['close', 'cambiarEstado'])

const cerrar = () => {
  emit('close')
}
</script>

<style src="../assets/usuarioDetalle.css"/>
