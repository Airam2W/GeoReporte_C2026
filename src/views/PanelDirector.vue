<template>
  <div class="dashboard-layout">
    <nav class="topbar">
      <div class="topbar-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <h1>GeoReporte | Dirección General</h1>
      </div>
      <div class="topbar-user" v-if="director">
        <div class="user-info">
          <span class="user-name">{{ director.nombre }}</span>
          <span class="user-dept">Director General</span>
        </div>
        <button class="btn-logout" @click="cerrarSesion" title="Cerrar Sesión">
          <!-- SVG Icono Salir -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </nav>

    <main class="dashboard-content">
      <header class="content-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2>Gestión de Personal</h2>
          <p>Administra los accesos y roles del personal del ayuntamiento.</p>
        </div>
        <button class="btn-primario" style="background-color: #1a6b2f; padding: 10px 20px; color: white; border-radius: 8px; font-weight: bold; border: none; cursor: pointer;" @click="abrirCrearUsuario">
          + Nuevo Usuario
        </button>
      </header>

      <!-- Filtros -->
      <section class="filtros-card">
        <div class="filtro-grupo input-icono">
          <!-- SVG Buscar -->
          <svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" width="18" height="18"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input v-model="filtros.busqueda" type="text" placeholder="Buscar por nombre, apellidos o correo..." />
        </div>

        <div class="filtro-grupo">
          <select v-model="filtros.rol">
            <option value="">Todos los roles</option>
            <option v-for="rol in rolesOpciones" :key="rol.id" :value="rol.id">
              {{ rol.nombre }}
            </option>
          </select>
        </div>

        <div class="filtro-grupo">
          <select v-model="filtros.estado">
            <option value="">Todos los estados</option>
            <option value="Alta">Alta</option>
            <option value="Baja">Baja</option>
          </select>
        </div>
      </section>

      <!-- Tabla de Usuarios -->
      <div class="tabla-contenedor">
        <table class="tabla-reportes">
          <thead>
            <tr>
              <th>NOMBRE</th>
              <th>CORREO</th>
              <th>ROL</th>
              <th>ESTADO</th>
              <th class="text-center">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando" class="fila-vacia"><td colspan="5">Cargando personal...</td></tr>
            <tr v-else-if="usuariosFiltrados.length === 0" class="fila-vacia"><td colspan="5">No se encontró personal con estos filtros.</td></tr>
            <tr v-else v-for="user in usuariosFiltrados" :key="user.id" class="fila-datos">
              <td class="font-bold">{{ user.nombre }} {{ user.apellido_p }} {{ user.apellido_m }}</td>
              <td>{{ user.correo }}</td>
              <td>
                <span class="badge badge-gris">{{ user.tipoUsuario?.nombre || 'N/A' }}</span>
              </td>
              <td>
                <span :class="['badge', user.estadoadministrativo === 'Alta' ? 'badge-verde' : 'badge-rojo']">
                  {{ user.estadoadministrativo }}
                </span>
              </td>
              <td class="acciones-celda">
                <button class="btn-accion btn-ver" title="Ver detalles" @click="abrirModalVer(user)">👁️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <UsuarioDetalleModal
      :visible="modalVisible"
      :usuario="usuarioActivo"
      @close="cerrarModalVer"
      @cambiarEstado="cambiarEstadoUsuario"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import Swal from 'sweetalert2'
import UsuarioDetalleModal from '../components/UsuarioDetalleModal.vue'

const router = useRouter()
const director = ref<any>(null)
const cargando = ref(true)
const usuarios = ref<any[]>([])
const rolesOpciones = ref<any[]>([])

const modalVisible = ref(false)
const usuarioActivo = ref<any>(null)

const filtros = ref({
  busqueda: '',
  rol: '',
  estado: ''
})

onMounted(async () => {
  const sessionData = localStorage.getItem('adminSession')
  if (!sessionData) {
    router.push('/')
    return
  }
  const sesion = JSON.parse(sessionData)

  // Validar que sea Director General (ID 1 basado en tu esquema)
  if (sesion.tipo_id !== 1) {
    Swal.fire('Acceso Denegado', 'No tienes permisos para ver esta sección.', 'error')
    router.push('/dashboard') // Mandarlo de regreso a su panel
    return
  }
  director.value = sesion

  await cargarRoles()
  await cargarUsuarios()
})

const cargarRoles = async () => {
  // Traer los tipos de usuario, excluyendo al Director General (ID 1)
  const { data } = await supabase
    .from('tipousuario')
    .select('id, nombre')
    .neq('id', 1)

  if (data) rolesOpciones.value = data
}

const cargarUsuarios = async () => {
  cargando.value = true
  // Traer usuarios excluyendo al tipo_id 1 (Director General)
  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      id, correo, nombre, apellido_p, apellido_m, estadoadministrativo, tipo_id,
      tipoUsuario:tipo_id (nombre)
    `)
    .neq('tipo_id', 1)
    .order('nombre', { ascending: true })

  if (!error && data) {
    usuarios.value = data
  }
  cargando.value = false
}

const usuariosFiltrados = computed(() => {
  return usuarios.value.filter(u => {
    const q = filtros.value.busqueda.toLowerCase()
    const nombreCompleto = `${u.nombre} ${u.apellido_p} ${u.apellido_m}`.toLowerCase()
    const coincideBusqueda = nombreCompleto.includes(q) || u.correo.toLowerCase().includes(q)
    const coincideRol = filtros.value.rol === '' || u.tipo_id == filtros.value.rol
    const coincideEstado = filtros.value.estado === '' || u.estadoadministrativo === filtros.value.estado

    return coincideBusqueda && coincideRol && coincideEstado
  })
})

const abrirModalVer = (user: any) => {
  usuarioActivo.value = user
  modalVisible.value = true
}

const cerrarModalVer = () => {
  modalVisible.value = false
  setTimeout(() => { usuarioActivo.value = null }, 300)
}

const cambiarEstadoUsuario = async (user: any, nuevoEstado: 'Alta' | 'Baja') => {
  const result = await Swal.fire({
    title: `¿Dar de ${nuevoEstado}?`,
    text: `¿Estás seguro de cambiar el estado de ${user.nombre} a ${nuevoEstado}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: nuevoEstado === 'Alta' ? '#2e7d32' : '#c62828',
    cancelButtonColor: '#888',
    confirmButtonText: `Sí, dar de ${nuevoEstado}`,
    cancelButtonText: 'Cancelar',
    reverseButtons: true
  })

  if (result.isConfirmed) {
    const { error } = await supabase
      .from('usuarios')
      .update({ estadoadministrativo: nuevoEstado })
      .eq('id', user.id)

    if (!error) {
      // Actualizar localmente
      const index = usuarios.value.findIndex(u => u.id === user.id)
      if (index !== -1) usuarios.value[index].estadoadministrativo = nuevoEstado

      cerrarModalVer()
      Swal.fire('¡Actualizado!', `El usuario ahora está dado de ${nuevoEstado}.`, 'success')
    } else {
      Swal.fire('Error', 'No se pudo actualizar el estado.', 'error')
    }
  }
}

const abrirCrearUsuario = () => {
  // Aquí podrías abrir otro modal o navegar a una ruta /crear-usuario
  Swal.fire({
    title: 'Crear Nuevo Usuario',
    text: 'Aquí se implementará el formulario para dar de alta administradores, supervisores, etc.',
    icon: 'info',
    confirmButtonColor: '#1a6b2f'
  })
}

const cerrarSesion = () => {
  localStorage.removeItem('adminSession')
  router.push('/')
}
</script>

<style src="../assets/panelAdministrador.css"></style>
