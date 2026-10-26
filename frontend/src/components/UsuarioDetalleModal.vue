<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay">
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
              <p class="destacado">
                {{ usuario.nombre }} {{ usuario.apellido_p }} {{ usuario.apellido_m }}
              </p>
            </div>

            <div class="info-grupo-doble">
              <div class="info-item">
                <label>Correo Electrónico</label>
                <p>{{ usuario.correo }}</p>
              </div>
              <div class="info-item">
                <label>Tipo de Usuario</label>
                <p :class="['badge badge-verde']" style="font-weight: lighter">
                  {{ usuario.tipousuario?.nombre || 'No asignado' }}
                </p>
              </div>
            </div>

            <div class="info-grupo-doble" style="margin-top: 16px">
              <div class="info-item">
                <label>Departamento</label>
                <p>{{ usuario.departamentoNombre || 'No asignado / Externo' }}</p>
              </div>
            </div>

            <div class="info-grupo-doble" style="margin-top: 16px">
              <!-- Mostrar solo si está de Alta -->
              <div class="info-item" v-if="usuario.estadoadministrativo === 'Alta'">
                <label>Fecha de Alta</label>
                <p>{{ formatearFechaLocal(usuario.fechaalta) }}</p>
              </div>

              <!-- Mostrar solo si está de Baja -->
              <div class="info-item" v-else-if="usuario.estadoadministrativo === 'Baja'">
                <label>Fecha de Baja</label>
                <p>{{ formatearFechaLocal(usuario.fechabaja) }}</p>
              </div>
            </div>

            <div
              v-if="[3, 4, 5].includes(usuario.tipousuario_id)"
              class="jerarquia-box"
              style="margin-top: 20px"
            >
              <label>Jerarquía Administrativa</label>

              <!-- Supervisor: mostrar sus Jefes -->
              <div v-if="usuario.tipousuario_id === 3" class="jerarquia-lista">
                <div v-if="!usuario.jefes || usuario.jefes.length === 0" class="jerarquia-vacio">
                  Sin jefes asignados
                </div>
                <div v-for="jefe in usuario.jefes" :key="jefe.id" class="jerarquia-item">
                  <span class="jerarquia-rol badge-jefe">Jefe</span>
                  <span class="jerarquia-nombre">
                    {{ jefe.usuarios?.nombre || 'No asignado' }} {{ jefe.usuarios?.apellido_p }}
                    {{ jefe.usuarios?.apellido_m }}
                  </span>
                </div>
              </div>

              <!-- Jefe: mostrar su Supervisor y sus Trabajadores -->
              <div v-else-if="usuario.tipousuario_id === 4" class="jerarquia-lista">
                <div class="jerarquia-item">
                  <span class="jerarquia-rol badge-supervisor">Supervisor</span>
                  <span class="jerarquia-nombre">
                    {{ usuario.supervisor?.usuarios?.nombre || 'No asignado' }}
                    {{ usuario.supervisor?.usuarios?.apellido_p }}
                    {{ usuario.supervisor?.usuarios?.apellido_m }}
                  </span>
                </div>

                <div class="jerarquia-separador"></div>

                <div
                  v-if="!usuario.trabajadores || usuario.trabajadores.length === 0"
                  class="jerarquia-vacio"
                >
                  Sin trabajadores asignados
                </div>
                <div v-for="trab in usuario.trabajadores" :key="trab.id" class="jerarquia-item">
                  <span class="jerarquia-rol badge-trabajador">Trabajador</span>
                  <span class="jerarquia-nombre">
                    {{ trab.usuarios?.nombre }} {{ trab.usuarios?.apellido_p }}
                    {{ trab.usuarios?.apellido_m }}
                  </span>
                </div>
              </div>

              <!-- Trabajador: mostrar su Jefe y el Supervisor de ese Jefe -->
              <div v-else-if="usuario.tipousuario_id === 5" class="jerarquia-lista">
                <div class="jerarquia-item">
                  <span class="jerarquia-rol badge-supervisor">Supervisor</span>
                  <span class="jerarquia-nombre">
                    {{ usuario.jefe?.supervisor?.usuarios?.nombre || 'No asignado' }}
                    {{ usuario.jefe?.supervisor?.usuarios?.apellido_p }}
                    {{ usuario.jefe?.supervisor?.usuarios?.apellido_m }}
                  </span>
                </div>
                <div class="jerarquia-item">
                  <span class="jerarquia-rol badge-jefe">Jefe</span>
                  <span class="jerarquia-nombre">
                    {{ usuario.jefe?.usuarios?.nombre || 'No asignado' }}
                    {{ usuario.jefe?.usuarios?.apellido_p }}
                    {{ usuario.jefe?.usuarios?.apellido_m }}
                  </span>
                </div>
              </div>
            </div>

            <div class="estado-actual-box" style="margin-top: 20px">
              <label>Estado Actual</label>
              <span
                :class="[
                  'badge badge-grande',
                  usuario.estadoadministrativo === 'Alta' ? 'badge-verde' : 'badge-rojo',
                ]"
              >
                {{ usuario.estadoadministrativo }}
              </span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secundario" @click="cerrar">Cerrar</button>

          <button
            v-if="usuario?.estadoadministrativo === 'Alta'"
            class="btn-primario"
            style="background-color: #c62828"
            @click="$emit('cambiarEstado', usuario, 'Baja')"
          >
            Dar de Baja
          </button>

          <button
            v-else
            class="btn-primario"
            style="background-color: #2e7d32"
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
import { formatearFechaLocal } from '@/logic/reporteDetalleModal'

defineProps({
  visible: { type: Boolean, default: false },
  usuario: { type: Object, default: null },
})

const emit = defineEmits(['close', 'cambiarEstado'])

const cerrar = () => {
  emit('close')
}
</script>

<style src="../assets/usuarioDetalle.css" />
