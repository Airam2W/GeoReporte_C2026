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
          <span class="user-dept">¡Bienvenido Director!</span>
        </div>
        <button class="btn-logout" @click="cerrarSesion" title="Cerrar Sesión">
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
        <button class="btn-primario" title="Agregar usuario" @click="abrirModalForm()" style="background-color: #1a6b2f; padding: 10px 20px; color: white; border-radius: 8px; font-weight: bold; border: none; cursor: pointer;">
          Crear Usuario
        </button>
      </header>

      <section class="filtros-card">
        <div class="filtro-grupo input-icono">
          <svg viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" width="18" height="18"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input v-model="filtros.busqueda" type="text" placeholder="Buscar por nombre, apellidos o correo..." />
        </div>

        <div class="filtro-grupo">
          <select name="rol" v-model="filtros.rol">
            <option value="">Todos los roles</option>
            <option v-for="rol in rolesOpciones" :key="rol.id" :value="rol.id">
              {{ rol.nombre }}
            </option>
          </select>
        </div>

        <div class="filtro-grupo">
          <select name="departamento" v-model="filtros.departamento">
            <option value="">Todos los departamentos</option>
            <option v-for="dep in departamentosOpciones" :key="dep.id" :value="dep.id">
              {{ dep.nombre }}
            </option>
          </select>
        </div>

        <div class="filtro-grupo">
          <select name="estado" v-model="filtros.estado">
            <option value="">Todos los estados</option>
            <option value="Alta">Alta</option>
            <option value="Baja">Baja</option>
          </select>
        </div>
      </section>

      <div class="tabla-contenedor">
        <table class="tabla-reportes">
          <thead>
            <tr>
              <th>NOMBRE</th>
              <th>CORREO</th>
              <th>ROL</th>
              <th>DEPARTAMENTO</th>
              <th>ESTADO</th>
              <th class="text-center">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando" class="fila-vacia"><td colspan="6">Cargando personal...</td></tr>
            <tr v-else-if="usuariosFiltrados.length === 0" class="fila-vacia"><td colspan="6">No se encontró personal con estos filtros.</td></tr>
            <tr v-else v-for="user in usuariosFiltrados" :key="user.id" class="fila-datos">
              <td class="font-bold">{{ user.nombre }} {{ user.apellido_p }} {{ user.apellido_m }}</td>
              <td>{{ user.correo }}</td>
              <td>
                <span class="badge badge-gris">{{ user.tipousuario?.nombre || 'N/A' }}</span>
              </td>
              <td><span class="badge badge-gris">{{ user.departamentoNombre || '-' }}</span></td>
              <td>
                <span :class="['badge', user.estadoadministrativo === 'Alta' ? 'badge-verde' : 'badge-rojo']">
                  {{ user.estadoadministrativo }}
                </span>
              </td>
              <td class="acciones-celda">
                <button class="btn-accion btn-ver" title="Ver detalles" @click="abrirModalVer(user)">👁️</button>
                <button class="btn-accion btn-editar" tittle="Editar usuario" @click="abrirModalForm(user)">✏️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <UsuarioFormModal
      :visible="modalFormVisible"
      :usuarioAEditar="usuarioActivo"
      :roles="rolesOpciones"
      :departamentos="departamentosOpciones"
      @close="cerrarModalForm"
      @save="ejecutarGuardadoUsuario"
    />

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
import UsuarioFormModal from '../components/UsuarioFormModal.vue'

const router = useRouter()
const director = ref<any>(null)
const cargando = ref(true)
const usuarios = ref<any[]>([])
const rolesOpciones = ref<any[]>([])
const departamentosOpciones = ref<any[]>([])

const modalVisible = ref(false)
const modalFormVisible = ref(false)
const usuarioActivo = ref<any>(null)

const filtros = ref({
  busqueda: '',
  rol: '',
  departamento: '',
  estado: 'Alta'
})

onMounted(async () => {
  const sessionData = localStorage.getItem('adminSession')
  if (!sessionData) {
    router.push('/')
    return
  }
  const sesion = JSON.parse(sessionData)

  if (sesion.tipo_id !== 1) {
    Swal.fire('Acceso Denegado', 'No tienes permisos para ver esta sección.', 'error')
    router.push('/dashboard')
    return
  }
  director.value = sesion

  await cargarCatalogos()
  await cargarUsuarios()
})

const cargarCatalogos = async () => {
  const { data: rData } = await supabase
    .from('tipousuario')
    .select(`id, nombre`)
    .neq('id', 1)

  if (rData)
    rolesOpciones.value = rData

  const { data: dData } = await supabase
    .from('departamentos')
    .select(`id, nombre, nombreamigable`)

  if (dData)
    departamentosOpciones.value = dData
}

const cargarUsuarios = async () => {
  cargando.value = true
  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      id, correo, nombre, apellido_p, apellido_m, estadoadministrativo, tipousuario_id,
      tipousuario:tipousuario_id (nombre),
      administradores (created_at,
        departamentos(id, nombre)
      ),
      supervisores (created_at,
        departamentos(id, nombre)
      )
    `)
    .neq('tipousuario_id', 1)
    .order('nombre', { ascending: true })

  if (!error && data) {
    usuarios.value = data.map(u => {
      const rolData = u.administradores?.[0] || u.supervisores?.[0] || {}
      return {
        ...u,
        created_at: rolData.created_at || null,
        departamento_id: rolData.departamentos?.id || null,
        departamentoNombre: rolData.departamentos?.nombre || ''
      }
    })
  }
  cargando.value = false
}

const usuariosFiltrados = computed(() => {
  return usuarios.value.filter(u => {
    const q = filtros.value.busqueda.toLowerCase()
    const nombreCompleto = `${u.nombre} ${u.apellido_p} ${u.apellido_m}`.toLowerCase()
    const coincideBusqueda = nombreCompleto.includes(q) || u.correo.toLowerCase().includes(q)
    const coincideRol = filtros.value.rol === '' || u.tipousuario_id == filtros.value.rol
    const coincideDepto = filtros.value.departamento === '' || u.departamento_id === filtros.value.departamento
    const coincideEstado = filtros.value.estado === '' || u.estadoadministrativo === filtros.value.estado

    return coincideBusqueda && coincideRol && coincideDepto && coincideEstado
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

const abrirModalForm = (user: any = null) => {
  usuarioActivo.value = user
  modalFormVisible.value = true
}

const cerrarModalForm = () => {
  modalFormVisible.value = false
  setTimeout(() => { usuarioActivo.value = null }, 300)
}

const ejecutarGuardadoUsuario = async (formData: any, esEdicion: boolean) => {
  try {
    const idUsuario = esEdicion ? formData.id : null

    const { data, error } = await supabase.rpc('guardar_usuario', {
      p_id: idUsuario,
      p_nombre: formData.nombre,
      p_apellido_p: formData.apellido_p,
      p_apellido_m: formData.apellido_m || null,
      p_correo: formData.correo,
      p_contrasena: formData.contrasena || null,
      p_tipousuario_id: parseInt(formData.tipousuario_id),
      p_departamento_id: formData.departamento_id ? parseInt(formData.departamento_id) : null
    })

    if (error) {
      if (error.message.includes('unique constraint'))
        Swal.fire('Error', 'Ya existe un usuario registrado con este correo.', 'error')
      else
        throw error

      return

    }

    Swal.fire({
      title: esEdicion ? 'Usuario Actualizado' : 'Usuario Creado',
      text: `Se ha guardado a ${formData.nombre} correctamente.`,
      icon: 'success',
      confirmButtonColor: '#1a6b2f'
    })

    cerrarModalForm()
    await cargarUsuarios()

  } catch (error: any) {
    console.error('Error al guardar usuariro: ', error)
    Swal.fire('Error', 'Ocurrió un problema al guardar el usuario. ', 'error')
  }
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

const cerrarSesion = () => {
  localStorage.removeItem('adminSession')
  router.push('/')
}

</script>

<style src="../assets/panelAdministrador.css"/>
