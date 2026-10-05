<template>
  <div class="dashboard-layout">
    <nav class="topbar">
      <div class="topbar-logo">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          width="24"
          height="24"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <h1>GeoReporte | Dirección General</h1>
      </div>
      <div class="topbar-user" v-if="director">
        <div class="user-info">
          <span class="user-name">{{ director.nombre }} </span>
          <span class="user-dept">¡Bienvenido Director!</span>
        </div>
        <button class="btn-logout" @click="cerrarSesion" title="Cerrar Sesión">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            width="18"
            height="18"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </nav>

    <main class="dashboard-content">
      <nav class="tabs-secciones" aria-label="Secciones del panel">
        <button
          v-for="seccion in secciones"
          :key="seccion.valor"
          type="button"
          :class="['tab-seccion', { activa: filtros.seccion === seccion.valor }]"
          :aria-current="filtros.seccion === seccion.valor ? 'page' : undefined"
          @click="seleccionarSeccion(seccion.valor)"
        >
          {{ seccion.etiqueta }}
        </button>
      </nav>

      <header
        class="content-header"
        style="display: flex; justify-content: space-between; align-items: center"
      >
        <div>
          <h2>
            {{
              filtros.seccion === 'departamentos'
                ? 'Gestión de Departamentos'
                : filtros.seccion === 'problematicas'
                  ? 'Gestión de Problemáticas'
                  : 'Gestión de Personal'
            }}
          </h2>
          <p>
            {{
              filtros.seccion === 'departamentos'
                ? 'Administra los departamentos internos y externos del ayuntamiento.'
                : filtros.seccion === 'problematicas'
                  ? 'Administra los tipos de problemáticas reportables por departamento.'
                  : 'Administra los accesos y roles del personal del ayuntamiento.'
            }}
          </p>
        </div>
        <button
          class="btn-primario"
          :title="
            filtros.seccion === 'departamentos'
              ? 'Agregar departamento'
              : filtros.seccion === 'problematicas'
                ? 'Agregar problemática'
                : 'Agregar usuario'
          "
          @click="
            filtros.seccion === 'departamentos'
              ? abrirModalFormDepto()
              : filtros.seccion === 'problematicas'
                ? abrirModalFormProblematica()
                : abrirModalForm()
          "
          style="
            background-color: #1a6b2f;
            padding: 10px 20px;
            color: white;
            border-radius: 8px;
            font-weight: bold;
            border: none;
            cursor: pointer;
          "
        >
          {{
            filtros.seccion === 'departamentos'
              ? 'Agregar Departamento'
              : filtros.seccion === 'problematicas'
                ? 'Agregar Problemática'
                : 'Crear Usuario'
          }}
        </button>
      </header>

      <section class="filtros-card">
        <div class="filtro-grupo input-icono">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#888"
            stroke-width="2"
            width="18"
            height="18"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="filtros.busqueda"
            type="text"
            :placeholder="
              filtros.seccion === 'departamentos'
                ? 'Buscar por nombre de departamento...'
                : filtros.seccion === 'problematicas'
                  ? 'Buscar por nombre de problemática...'
                  : 'Buscar por nombre, apellidos o correo...'
            "
          />
        </div>

        <!-- Filtros exclusivos de Personal Administrativo -->
        <template v-if="filtros.seccion === 'personal'">
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

              <template v-if="String(filtros.rol) === '2' || String(filtros.rol) === '3'">
                <option v-for="dep in departamentosInternos" :key="dep.id" :value="dep.id">
                  {{ dep.nombre }}
                </option>
              </template>

              <template v-else-if="String(filtros.rol) === '6'">
                <option v-for="de in departamentosExternos" :key="de.id" :value="de.id">
                  {{ de.departamento }}
                </option>
              </template>

              <template v-else></template>
            </select>
          </div>

          <div class="filtro-grupo">
            <select name="estado" v-model="filtros.estado">
              <option value="">Todos los estados</option>
              <option value="Alta">Alta</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
        </template>

        <!-- Filtro exclusivo de Departamentos -->
        <template v-else-if="filtros.seccion === 'departamentos'">
          <div class="filtro-grupo">
            <select name="tipoDepartamento" v-model="filtros.tipoDepartamento">
              <option value="">Todos los tipos</option>
              <option value="Interno">Departamento Interno</option>
              <option value="Externo">Departamento Externo</option>
            </select>
          </div>

          <div class="filtro-grupo">
            <select name="estado" v-model="filtros.estado">
              <option value="">Todos los estados</option>
              <option value="Alta">Alta</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
        </template>
        <!-- Filtro exclusivo de Problemáticas -->
        <template v-else>
          <div class="filtro-grupo">
            <select name="tipoProblematica" v-model="filtros.tipoProblematica">
              <option value="">Todos los tipos</option>
              <option value="Interno">Problemática Interna</option>
              <option value="Externo">Problemática Externa</option>
            </select>
          </div>

          <div class="filtro-grupo">
            <select
              name="departamentoProblematica"
              v-model="filtros.departamentoProblematica"
              :disabled="filtros.tipoProblematica === ''"
            >
              <option value="">Todos los departamentos</option>

              <!-- Solo Internos -->
              <template v-if="filtros.tipoProblematica === 'Interno'">
                <option v-for="dep in departamentosInternos" :key="dep.id" :value="dep.id">
                  {{ dep.nombre }}
                </option>
              </template>

              <!-- Solo Externos -->
              <template v-else-if="filtros.tipoProblematica === 'Externo'">
                <option v-for="dep in departamentosExternos" :key="dep.id" :value="dep.id">
                  {{ dep.departamento }}
                </option>
              </template>
            </select>
          </div>

          <!-- Filtro de Problematicas Alta/Baja-->
          <div class="filtro-grupo">
            <select name="estado" v-model="filtros.estado">
              <option value="">Todos los estados</option>
              <option value="Alta">Alta</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
        </template>
      </section>

      <div class="tabla-contenedor">
        <!-- Tabla de Personal Administrativo -->
        <table v-if="filtros.seccion === 'personal'" class="tabla-reportes">
          <thead>
            <tr>
              <th>NOMBRE</th>
              <th>CORREO</th>
              <th>ROL</th>
              <th>DEPARTAMENTO / SUPERIOR</th>
              <th>ESTADO</th>
              <th class="text-center">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando" class="fila-vacia">
              <td colspan="6">Cargando personal...</td>
            </tr>
            <tr v-else-if="usuariosFiltrados.length === 0" class="fila-vacia">
              <td colspan="6">No se encontró personal con estos filtros.</td>
            </tr>
            <tr v-else v-for="user in usuariosFiltrados" :key="user.id" class="fila-datos">
              <td class="font-bold">
                {{ user.nombre }} {{ user.apellido_p }} {{ user.apellido_m }}
              </td>
              <td>{{ user.correo }}</td>
              <td>
                <span class="badge badge-gris">{{ user.tipousuario?.nombre || 'N/A' }}</span>
              </td>
              <td>
                <span class="badge badge-gris">{{ user.departamentoNombre || '-' }}</span>
              </td>
              <td>
                <span
                  :class="[
                    'badge',
                    user.estadoadministrativo === 'Alta' ? 'badge-verde' : 'badge-rojo',
                  ]"
                >
                  {{ user.estadoadministrativo }}
                </span>
              </td>
              <td class="acciones-celda">
                <button
                  class="btn-accion btn-ver"
                  title="Ver detalles"
                  @click="abrirModalVer(user)"
                >
                  👁️
                </button>
                <button class="btn-accion btn-editar" title="Editar" @click="abrirModalForm(user)">
                  ✏️
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Tabla de Departamentos -->
        <table v-else-if="filtros.seccion === 'departamentos'" class="tabla-reportes">
          <thead>
            <tr>
              <th>NOMBRE</th>
              <th>NOMBRE AMIGABLE</th>
              <th>TIPO</th>
              <th>ESTADO</th>
              <th class="text-center">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando" class="fila-vacia">
              <td colspan="4">Cargando departamentos...</td>
            </tr>
            <tr v-else-if="departamentosFiltrados.length === 0" class="fila-vacia">
              <td colspan="4">No se encontraron departamentos con estos filtros.</td>
            </tr>
            <tr
              v-else
              v-for="depto in departamentosFiltrados"
              :key="`${depto.tipo}-${depto.id}`"
              class="fila-datos"
            >
              <td class="font-bold">{{ depto.nombre }}</td>
              <td>{{ depto.nombreamigable || 'Sin asignar' }}</td>
              <td>
                <span :class="['badge', depto.tipo === 'Interno' ? 'badge-azul' : 'badge-gris']">
                  {{ depto.tipo }}
                </span>
              </td>
              <td>
                <span
                  :class="['badge', depto.raw.estado === 'Alta' ? 'badge-verde' : 'badge-rojo']"
                >
                  {{ depto.raw.estado || 'N/A' }}
                </span>
              </td>
              <td class="acciones-celda">
                <button
                  class="btn-accion btn-ver"
                  title="Ver detalles"
                  @click="abrirModalVerDepto(depto)"
                >
                  👁️
                </button>
                <button
                  class="btn-accion btn-editar"
                  title="Editar"
                  @click="abrirModalFormDepto(depto)"
                >
                  ✏️
                </button>
                <button
                  class="btn-accion btn-eliminar"
                  :title="depto.raw.estado === 'Alta' ? 'Dar de baja' : 'Dar de alta'"
                  @click="cambiarEstadoDepartamento(depto)"
                >
                  {{ depto.raw.estado === 'Alta' ? '⬇️' : '⬆️' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <table v-else class="tabla-reportes">
          <thead>
            <tr>
              <th>NOMBRE</th>
              <th>NOMBRE AMIGABLE</th>
              <th>DEPARTAMENTO</th>
              <th>TIPO</th>
              <th>ESTADO</th>
              <th class="text-center">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando" class="fila-vacia">
              <td colspan="5">Cargando problemáticas...</td>
            </tr>
            <tr v-else-if="problematicasFiltradas.length === 0" class="fila-vacia">
              <td colspan="5">No se encontraron problemáticas con estos filtros.</td>
            </tr>
            <tr
              v-else
              v-for="prob in problematicasFiltradas"
              :key="`${prob.tipo}-${prob.id}`"
              class="fila-datos"
            >
              <td class="font-bold">{{ prob.nombre }}</td>
              <td>{{ prob.nombreamigable || 'Sin asignar' }}</td>
              <td>{{ prob.departamentoNombre }}</td>
              <td>
                <span :class="['badge', prob.tipo === 'Interno' ? 'badge-azul' : 'badge-gris']">
                  {{ prob.tipo }}
                </span>
              </td>
              <td>
                <span :class="['badge', prob.estado === 'Alta' ? 'badge-verde' : 'badge-rojo']">
                  {{ prob.estado }}
                </span>
              </td>
              <td class="acciones-celda">
                <button
                  class="btn-accion btn-ver"
                  title="Ver detalles"
                  @click="abrirModalVerProblematica(prob)"
                >
                  👁️
                </button>
                <button
                  class="btn-accion btn-editar"
                  title="Editar"
                  @click="abrirModalFormProblematica(prob)"
                >
                  ✏️
                </button>
                <button
                  class="btn-accion btn-eliminar"
                  :title="prob.estado === 'Alta' ? 'Dar de baja' : 'Dar de alta'"
                  @click="cambiarEstadoProblema(prob)"
                >
                  {{ prob.estado === 'Alta' ? '⬇️' : '⬆️' }}
                </button>
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
      :departamentos-externos="departamentosExternosOpciones"
      :supervisores="supervisoresOpciones"
      :jefes="jefesOpciones"
      @close="cerrarModalForm"
      @save="ejecutarGuardadoUsuario"
    />

    <UsuarioDetalleModal
      :visible="modalVisible"
      :usuario="usuarioActivo"
      @close="cerrarModalVer"
      @cambiarEstado="cambiarEstadoUsuario"
    />

    <DepartamentoFormModal
      :visible="modalDeptoFormVisible"
      :departamentoAEditar="departamentoActivo"
      @close="cerrarModalFormDepto"
      @save="ejecutarGuardadoDepartamento"
    />

    <DepartamentoDetalleModal
      :visible="modalDeptoDetalleVisible"
      :departamento="departamentoActivo"
      @close="cerrarModalVerDepto"
      @cambiarEstado="cambiarEstadoDepartamento"
    />

    <ProblematicaFormModal
      :visible="modalProblematicaFormVisible"
      :problematicaAEditar="problematicaActivo"
      :departamentos="departamentosOpciones"
      :departamentos-externos="departamentosExternosOpciones"
      @close="cerrarModalFormProblematica"
      @save="ejecutarGuardadoProblematica"
    />

    <ProblematicaDetalleModal
      :visible="modalProblematicaDetalleVisible"
      :problematica="problematicaActivo"
      @close="cerrarModalVerProblematica"
      @cambiarEstado="cambiarEstadoProblema"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  selectOrder,
  selectAll,
  selectNeq,
  selectNeqOrder,
  updateEq,
  insert,
  deleteEq,
  callRpc,
} from '../services/supabaseController'
import Swal from 'sweetalert2'
import UsuarioDetalleModal from '../components/UsuarioDetalleModal.vue'
import UsuarioFormModal from '../components/UsuarioFormModal.vue'
import DepartamentoFormModal from '../components/DepartamentoFormModal.vue'
import DepartamentoDetalleModal from '../components/DepartamentoDetalleModal.vue'
import ProblematicaFormModal from '../components/ProblematicaFormModal.vue'
import ProblematicaDetalleModal from '../components/ProblematicaDetalleModal.vue'

const problematicasData = ref<any[]>([])

const modalProblematicaDetalleVisible = ref(false)
const modalProblematicaFormVisible = ref(false)
const problematicaActivo = ref<any>(null)

const departamentosData = ref<any[]>([])

const modalDeptoDetalleVisible = ref(false)
const modalDeptoFormVisible = ref(false)
const departamentoActivo = ref<any>(null)

const router = useRouter()
const director = ref<any>(null)
const cargando = ref(true)
const usuarios = ref<any[]>([])
const rolesOpciones = ref<any[]>([])
const departamentosOpciones = ref<any[]>([])
const departamentosExternosOpciones = ref<any[]>([])
const supervisoresOpciones = ref<any[]>([])
const jefesOpciones = ref<any[]>([])

const modalVisible = ref(false)
const modalFormVisible = ref(false)
const usuarioActivo = ref<any>(null)

const seccionGuardada = localStorage.getItem('panelSeccionActiva') || 'personal'

const secciones = [
  { valor: 'personal', etiqueta: 'Gestión de Personal' },
  { valor: 'departamentos', etiqueta: 'Departamentos' },
  { valor: 'problematicas', etiqueta: 'Problemáticas' },
]

const seleccionarSeccion = (valor: string) => {
  filtros.value.seccion = valor
  cargarCatalogos()
  cargarDepartamentos()
}

const filtros = ref({
  busqueda: '',
  rol: '',
  departamento: '',
  estado: 'Alta',
  seccion: seccionGuardada,
  tipoDepartamento: '',
  tipoProblematica: '',
  departamentoProblematica: '',
  estadoProblematica: '',
})

import { useCargando } from '../composable/useCargando'
const { mostrarCargando, ocultarCargando } = useCargando()

onMounted(async () => {
  mostrarCargando() // Mostrar el indicador de carga al iniciar
  const sessionData = localStorage.getItem('adminSession')
  if (!sessionData) {
    router.push('/')
    return
  }
  const sesion = JSON.parse(sessionData)

  if (sesion.tipo_id !== 1) {
    Swal.fire('Acceso Denegado', 'No tienes permisos para ver esta sección.', 'error')
    redireccionarUsuario()
    return
  }
  director.value = sesion

  await cargarCatalogos()
  await cargarDatos()
  await cargarDepartamentos()
  ocultarCargando() // Ocultar el indicador de carga después de cargar los datos
})

const departamentosInternos = ref<any[]>([])
const departamentosExternos = ref<any[]>([])

const cargarListaProblematicas = async () => {
  cargando.value = true

  const { data: internas, error: errorInt } = await selectOrder(
    'problemas',
    'nombre',
    ['id', 'nombre', 'nombreamigable', 'departamento_id', 'departamentos (id, nombre)', 'estado'],
    true, // 👈 true = ascendente, false = descendente
  )

  const { data: externas, error: errorExt } = await selectOrder(
    'problemas_externos',
    'nombre',
    [
      'id',
      'nombre',
      'nombreamigable',
      'departamento_externo_id',
      'departamentos_externos (id, departamento)',
      'estado',
    ],
    true, // 👈 true = ascendente, false = descendente
  )

  if (!errorInt && !errorExt) {
    const listaInternas = (internas || []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      nombreamigable: p.nombreamigable,
      tipo: 'Interno',
      departamento_id: p.departamento_id,
      departamentoNombre: p.departamentos?.nombre || 'Sin asignar',
      estado: p.estado,
      raw: p,
    }))

    const listaExternas = (externas || []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      nombreamigable: p.nombreamigable,
      tipo: 'Externo',
      departamento_id: p.departamento_externo_id,
      departamentoNombre: p.departamentos_externos?.departamento || 'Sin asignar',
      estado: p.estado,
      raw: p,
    }))

    problematicasData.value = [...listaInternas, ...listaExternas]
  }

  cargando.value = false
}

const cargarDepartamentos = async () => {
  const { data: internos } = await selectAll('departamentos', [
    'id',
    'nombre',
    'nombreamigable',
    'estado',
  ])

  const { data: externos } = await selectAll('departamentos_externos', [
    'id',
    'departamento',
    'estado',
  ])

  departamentosInternos.value = internos || []
  departamentosExternos.value = externos || []
}

const cargarListaDepartamentos = async () => {
  cargando.value = true

  const { data: internos, error: errorInt } = await selectOrder(
    'departamentos',
    'nombre',
    ['id', 'nombre', 'nombreamigable', 'estado'],
    true, // 👈 true = ascendente, false = descendente
  )

  const { data: externos, error: errorExt } = await selectOrder(
    'departamentos_externos',
    'departamento',
    ['id', 'departamento', 'estado'],
    true, // 👈 true = ascendente, false = descendente
  )

  if (!errorInt && !errorExt) {
    const listaInternos = (internos || []).map((d) => ({
      id: d.id,
      nombre: d.nombre,
      nombreamigable: d.nombreamigable,
      tipo: 'Interno',
      estado: d.estado,
      raw: d,
    }))

    const listaExternos = (externos || []).map((d) => ({
      id: d.id,
      nombre: d.departamento,
      nombreamigable: null,
      tipo: 'Externo',
      estado: d.estado,
      raw: d,
    }))

    departamentosData.value = [...listaInternos, ...listaExternos]
  }

  cargando.value = false
}

const cargarDatos = async () => {
  if (filtros.value.seccion === 'personal') {
    await cargarUsuarios()
  } else if (filtros.value.seccion === 'departamentos') {
    await cargarListaDepartamentos()
  } else {
    await cargarListaProblematicas()
  }
}

const cargarCatalogos = async () => {
  const { data: rData } = await selectNeq(
    'tipousuario',
    'id',
    1,
    ['id', 'nombre'], // 👈 columnas específicas
  )

  if (rData) rolesOpciones.value = rData

  const { data: dData } = await selectAll(
    'departamentos',
    ['id', 'nombre', 'nombreamigable', 'estado'], // 👈 columnas específicas
  )

  if (dData) departamentosOpciones.value = dData

  const { data: deData } = await selectAll(
    'departamentos_externos',
    ['id', 'departamento', 'estado'], // 👈 columnas específicas
  )

  if (deData) departamentosExternosOpciones.value = deData

  const { data: sData } = await selectAll(
    'supervisores',
    ['id', 'usuario_id', 'usuarios(id,nombre,apellido_p,apellido_m)'], // 👈 columnas específicas
  )

  if (sData) supervisoresOpciones.value = sData

  const { data: jData } = await selectAll(
    'jefes',
    ['id', 'usuario_id', 'usuarios(id,nombre,apellido_p,apellido_m)'], // 👈 columnas específicas
  )

  if (jData) jefesOpciones.value = jData
}
const cargarUsuarios = async () => {
  cargando.value = true
  const { data, error } = await selectNeqOrder(
    'usuarios',
    'tipousuario_id',
    1,
    'nombre',
    [
      'id',
      'correo',
      'nombre',
      'apellido_p',
      'apellido_m',
      'estadoadministrativo',
      'tipousuario_id',
      'fechaalta',
      'fechabaja',
      'tipousuario:tipousuario_id (nombre)',
      'administradores (created_at, departamentos(id, nombre))',
      'supervisores (created_at, departamentos(id, nombre), usuarios(id, nombre, apellido_p, apellido_m), jefes(id, usuarios(id, nombre, apellido_p, apellido_m)))',
      'jefes (created_at, supervisores(id, usuarios(id, nombre, apellido_p, apellido_m)), trabajadores(id, usuarios(id, nombre, apellido_p, apellido_m)))',
      'trabajadores (created_at, jefes(id, usuarios(id, nombre, apellido_p, apellido_m), supervisores(id, usuarios(id, nombre, apellido_p, apellido_m))) )',
      'personal_externo (created_at, departamentos_externos(id, departamento))',
    ],
    true, // 👈 true = ascendente, false = descendente
  )

  if (!error && data) {
    usuarios.value = data.map((u) => {
      const rolData =
        u.administradores?.[0] ||
        u.supervisores?.[0] ||
        u.jefes?.[0] ||
        u.trabajadores?.[0] ||
        u.personal_externo?.[0] ||
        {}

      // --- Jerarquía Administrativa según el rol ---
      let jerarquia = {}
      if (u.tipousuario_id === 3) {
        // Supervisor: jefes bajo su mando
        jerarquia.jefes = rolData.jefes || []
      } else if (u.tipousuario_id === 4) {
        // Jefe: su supervisor y sus trabajadores
        jerarquia.supervisor = rolData.supervisores || null
        jerarquia.trabajadores = rolData.trabajadores || []
      } else if (u.tipousuario_id === 5) {
        // Trabajador: su jefe, y el supervisor de ese jefe
        const jefeData = rolData.jefes || null
        jerarquia.jefe = jefeData
          ? { ...jefeData, supervisor: jefeData.supervisores || null }
          : null
      }
      // Para cualquier otro tipousuario_id, jerarquia queda vacío
      // y el template no muestra ese apartado (no hay v-if que lo cubra)

      return {
        ...u,
        ...jerarquia,
        created_at: rolData.created_at || null,
        departamento_id:
          rolData.departamentos?.id ||
          rolData.supervisores?.id ||
          rolData.jefes?.id ||
          rolData.departamentos_externos?.id ||
          null,
        departamentoNombre:
          rolData.departamentos?.nombre ||
          (rolData.supervisores?.usuarios
            ? `${rolData.supervisores.usuarios.nombre} ${rolData.supervisores.usuarios.apellido_p} ${rolData.supervisores.usuarios.apellido_m || ''}`.trim()
            : null) ||
          (rolData.jefes?.usuarios
            ? `${rolData.jefes.usuarios.nombre} ${rolData.jefes.usuarios.apellido_p} ${rolData.jefes.usuarios.apellido_m || ''}`.trim()
            : null) ||
          rolData.departamentos_externos?.departamento ||
          '',
      }
    })
  }
  cargando.value = false
}

import { watch } from 'vue'
import { redireccionarUsuario } from '../logic/redirectUser'

watch(
  () => filtros.value.seccion,
  (nuevaSeccion) => {
    localStorage.setItem('panelSeccionActiva', nuevaSeccion)

    filtros.value.rol = ''
    filtros.value.departamento = ''
    filtros.value.tipoDepartamento = ''
    filtros.value.tipoProblematica = ''
    filtros.value.departamentoProblematica = ''
    filtros.value.estado = 'Alta'
    filtros.value.busqueda = ''
    cargarDatos()
  },
)

watch(
  () => filtros.value.tipoProblematica,
  () => {
    filtros.value.departamentoProblematica = ''
  },
)

const usuariosFiltrados = computed(() => {
  return usuarios.value.filter((u) => {
    const q = filtros.value.busqueda.toLowerCase()
    const nombreCompleto = `${u.nombre} ${u.apellido_p} ${u.apellido_m}`.toLowerCase()
    const coincideBusqueda = nombreCompleto.includes(q) || u.correo.toLowerCase().includes(q)
    const coincideRol = filtros.value.rol === '' || u.tipousuario_id == filtros.value.rol
    const coincideDepto =
      filtros.value.departamento === '' ||
      String(u.departamento_id) === String(filtros.value.departamento)
    const coincideEstado =
      filtros.value.estado === '' || u.estadoadministrativo === filtros.value.estado

    return coincideBusqueda && coincideRol && coincideDepto && coincideEstado
  })
})

const problematicasFiltradas = computed(() => {
  return problematicasData.value.filter((p) => {
    const q = filtros.value.busqueda.toLowerCase()
    const coincideBusqueda =
      p.nombre.toLowerCase().includes(q) || (p.nombreamigable || '').toLowerCase().includes(q)

    const coincideTipo =
      filtros.value.tipoProblematica === '' ||
      p.tipo.toLowerCase() === filtros.value.tipoProblematica.toLowerCase()

    const coincideDepartamento =
      filtros.value.departamentoProblematica === '' ||
      String(p.departamento_id) === String(filtros.value.departamentoProblematica)

    const coincideEstado = filtros.value.estado === '' || p.estado === filtros.value.estado

    return coincideBusqueda && coincideTipo && coincideDepartamento && coincideEstado
  })
})

const departamentosFiltrados = computed(() => {
  return departamentosData.value.filter((d) => {
    const q = filtros.value.busqueda.toLowerCase()
    const coincideBusqueda = d.nombre.toLowerCase().includes(q)

    const coincideTipo =
      filtros.value.tipoDepartamento === '' ||
      d.tipo.toLowerCase() === filtros.value.tipoDepartamento.toLowerCase()

    const coincideEstado = filtros.value.estado === '' || d.estado === filtros.value.estado

    return coincideBusqueda && coincideTipo && coincideEstado
  })
})

const abrirModalVerProblematica = (prob: any) => {
  problematicaActivo.value = prob
  modalProblematicaDetalleVisible.value = true
}

const cerrarModalVerProblematica = () => {
  modalProblematicaDetalleVisible.value = false
  setTimeout(() => {
    problematicaActivo.value = null
  }, 300)
}

const abrirModalFormProblematica = (prob: any = null) => {
  problematicaActivo.value = prob
  modalProblematicaFormVisible.value = true
}

const cambiarEstadoProblematica = async (prob: any) => {
  const nuevoEstado = prob.estado === 'Alta' ? 'Baja' : 'Alta'
  // Confirmación pregunta si el usuario realmente quiere darla de baja o alta
  Swal.fire({
    title: `¿Deseas dar de ${nuevoEstado === 'Alta' ? 'alta' : 'baja'} esta problemática?`,
    text: `Se dará de ${nuevoEstado === 'Alta' ? 'alta' : 'baja'} "${prob.nombre}".`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#1a6b2f',
    cancelButtonColor: '#888',
    confirmButtonText: `Sí, ${nuevoEstado === 'Alta' ? 'Dar de Alta' : 'Dar de Baja'}`,
    cancelButtonText: 'Cancelar',
  }).then((result) => {
    if (result.isConfirmed) {
      cambiarEstadoProblematicaEnBD(prob)
      Swal.fire({
        title: `Problemática ${nuevoEstado === 'Alta' ? 'dada de Alta' : 'dada de Baja'}`,
        text: `Se ha dado de ${nuevoEstado === 'Alta' ? 'alta' : 'baja'} "${prob.nombre}" correctamente.`,
        icon: 'success',
        confirmButtonColor: '#1a6b2f',
      })
      cerrarModalVerProblematica()
    }
  })
}

const cambiarEstadoProblematicaEnBD = async (prob: any) => {
  const nuevoEstado = prob.estado === 'Alta' ? 'Baja' : 'Alta'
  const tabla = prob.tipo === 'Interno' ? 'problemas' : 'problemas_externos'

  const { error } = await updateEq(
    tabla, // nombre de la tabla
    'id', // campo para eq
    prob.id, // valor a comparar
    { estado: nuevoEstado }, // data a actualizar
  )

  if (error) {
    console.error('Error al cambiar estado de problemática: ', error)
    Swal.fire('Error', 'Ocurrió un problema al cambiar el estado de la problemática.', 'error')
    return
  }

  await cargarDatos()
  cerrarModalVerProblematica()
}

const cerrarModalFormProblematica = () => {
  modalProblematicaFormVisible.value = false
  setTimeout(() => {
    problematicaActivo.value = null
  }, 300)
}

const ejecutarGuardadoProblematica = async (formData: any, esEdicion: boolean) => {
  try {
    if (esEdicion) {
      if (formData.tipo === 'Interno') {
        const { error } = await updateEq(
          'problemas', // tabla
          'id', // campo para eq
          formData.id, // valor a comparar
          {
            nombre: formData.nombre,
            nombreamigable: formData.nombreamigable,
            departamento_id: formData.departamento_id,
          }, // data a actualizar
        )
        if (error) throw error
      } else {
        const { error } = await updateEq(
          'problemas_externos', // tabla
          'id', // campo para eq
          formData.id, // valor a comparar
          {
            nombre: formData.nombre,
            nombreamigable: formData.nombreamigable,
            departamento_externo_id: formData.departamento_id,
          }, // data a actualizar
        )
        if (error) throw error
      }
    } else {
      if (formData.tipo === 'Interno') {
        const { error } = await insert('problemas', {
          nombre: formData.nombre,
          nombreamigable: formData.nombreamigable,
          departamento_id: formData.departamento_id,
          estado: 'Alta',
        })
        if (error) throw error
      } else {
        const { error } = await insert('problemas_externos', {
          nombre: formData.nombre,
          nombreamigable: formData.nombreamigable,
          departamento_externo_id: formData.departamento_id,
          estado: 'Alta',
        })
        if (error) throw error
      }
    }

    Swal.fire({
      title: esEdicion ? 'Problemática Actualizada' : 'Problemática Creada',
      text: `Se ha guardado "${formData.nombre}" correctamente.`,
      icon: 'success',
      confirmButtonColor: '#1a6b2f',
    })

    cerrarModalFormProblematica()
    await cargarDatos()
  } catch (error: any) {
    console.error('Error al guardar problemática: ', error)
    Swal.fire('Error', 'Ocurrió un problema al guardar la problemática.', 'error')
  }
}

const cambiarEstadoProblema = async (prob: any) => {
  const nuevoEstado = prob.estado === 'Alta' ? 'Alta' : 'Baja'
  const result = await Swal.fire({
    title: `¿Deseas dar de ${nuevoEstado === 'Alta' ? 'alta' : 'baja'} esta problemática?`,
    text: `Se ${nuevoEstado === 'Alta' ? 'dará de baja' : 'dará de alta'} "${prob.nombre}".`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#0060c0',
    cancelButtonColor: '#888',
    confirmButtonText: `Sí, dar de ${nuevoEstado === 'Alta' ? 'baja' : 'alta'}`,
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    customClass: { container: 'swal-difuminado' },
  })

  if (!result.isConfirmed) return

  const tabla = prob.tipo === 'Interno' ? 'problemas' : 'problemas_externos'
  const { error } = await deleteEq(
    tabla, // nombre de la tabla
    'id', // campo para eq
    prob.id, // valor a comparar
  )

  if (error) {
    cambiarEstadoProblematicaEnBD(prob) // Cambia el estado a "Baja" si no se puede eliminar
  }

  await cargarDatos()
  Swal.fire({
    title: 'Problemática Actualizada',
    text: `Se ha actualizado el estado de "${prob.nombre}" correctamente.`,
    icon: 'success',
    confirmButtonColor: '#1a6b2f',
  })
}

const abrirModalVerDepto = (depto: any) => {
  departamentoActivo.value = depto
  modalDeptoDetalleVisible.value = true
}

const cerrarModalVerDepto = () => {
  modalDeptoDetalleVisible.value = false
  setTimeout(() => {
    departamentoActivo.value = null
  }, 300)
}

const abrirModalFormDepto = (depto: any = null) => {
  departamentoActivo.value = depto
  modalDeptoFormVisible.value = true
}

const cerrarModalFormDepto = () => {
  modalDeptoFormVisible.value = false
  setTimeout(() => {
    departamentoActivo.value = null
  }, 300)
}

const ejecutarGuardadoDepartamento = async (formData: any, esEdicion: boolean) => {
  try {
    if (esEdicion) {
      if (formData.tipo === 'Interno') {
        const { error } = await updateEq(
          'departamentos', // tabla
          'id', // campo para eq
          formData.id, // valor a comparar
          {
            nombre: formData.nombre,
            nombreamigable: formData.nombreamigable,
          }, // data a actualizar
        )
        if (error) throw error
      } else {
        const { error } = await updateEq(
          'departamentos_externos', // tabla
          'id', // campo para eq
          formData.id, // valor a comparar
          {
            departamento: formData.nombre,
          }, // data a actualizar
        )
        if (error) throw error
      }
    } else {
      if (formData.tipo === 'Interno') {
        const { error } = await insert('departamentos', {
          nombre: formData.nombre,
          nombreamigable: formData.nombreamigable,
          estado: 'Alta',
        })
        if (error) throw error
      } else {
        const { error } = await insert('departamentos_externos', {
          departamento: formData.nombre,
          estado: 'Alta',
        })
        if (error) throw error
      }
    }

    Swal.fire({
      title: esEdicion ? 'Departamento Actualizado' : 'Departamento Creado',
      text: `Se ha guardado "${formData.nombre}" correctamente.`,
      icon: 'success',
      confirmButtonColor: '#1a6b2f',
    })

    cerrarModalFormDepto()
    await cargarDatos()
  } catch (error: any) {
    console.error('Error al guardar departamento: ', error)
    Swal.fire('Error', 'Ocurrió un problema al guardar el departamento.', 'error')
  }
}

const cambiarEstadoDepartamento = async (depto: any) => {
  const result = await Swal.fire({
    title: '¿Cambiar estado del departamento?',
    text: `Se cambiará el estado de "${depto.nombre}" a ${depto.estado === 'Alta' ? 'Baja' : 'Alta'}.`,
    icon: 'info',
    showCancelButton: true,
    confirmButtonColor: '#0060c0',
    cancelButtonColor: '#888',
    confirmButtonText: 'Sí, cambiar estado',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    customClass: { container: 'swal-difuminado' },
  })

  if (!result.isConfirmed) return

  const tabla = depto.tipo === 'Interno' ? 'departamentos' : 'departamentos_externos'
  const { error } = await deleteEq(
    tabla, // nombre de la tabla
    'id', // campo para eq
    depto.id, // valor a comparar
  )

  if (error) {
    cambiarEstadoDepartamentoEnBD(depto) // Cambia el estado a "Baja" si no se puede eliminar
    return
  }

  // Refresca la lista y los catálogos para que el departamento eliminado
  // ya no aparezca en los filtros ni en los formularios
  await cargarDatos()
  await cargarCatalogos()
  await cargarDepartamentos()

  Swal.fire({
    title: 'Departamento Eliminado',
    text: `Se ha eliminado "${depto.nombre}" correctamente.`,
    icon: 'success',
    confirmButtonColor: '#1a6b2f',
  })
}

const cambiarEstadoDepartamentoEnBD = async (depto: any) => {
  const nuevoEstado = depto.estado === 'Alta' ? 'Baja' : 'Alta'
  const tabla = depto.tipo === 'Interno' ? 'departamentos' : 'departamentos_externos'

  const { error } = await updateEq(
    tabla, // nombre de la tabla
    'id', // campo para eq
    depto.id, // valor a comparar
    { estado: nuevoEstado }, // data a actualizar
  )

  if (error) {
    console.error('Error al cambiar estado de departamento: ', error)
    Swal.fire('Error', 'Ocurrió un problema al cambiar el estado del departamento.', 'error')
    return
  }

  await cargarDatos()
  cerrarModalVerDepto()
}

const abrirModalVer = (user: any) => {
  usuarioActivo.value = user
  modalVisible.value = true
}

const cerrarModalVer = () => {
  modalVisible.value = false
  setTimeout(() => {
    usuarioActivo.value = null
  }, 300)
}

const abrirModalForm = (user: any = null) => {
  usuarioActivo.value = user
  modalFormVisible.value = true
}

const cerrarModalForm = () => {
  modalFormVisible.value = false
  setTimeout(() => {
    usuarioActivo.value = null
  }, 300)
}

const ejecutarGuardadoUsuario = async (formData: any, esEdicion: boolean) => {
  try {
    const { data, error } = await callRpc('guardar_usuario', {
      p_id: esEdicion ? formData.id : null,
      p_nombre: formData.nombre,
      p_apellido_p: formData.apellido_p,
      p_apellido_m: formData.apellido_m || null,
      p_correo: formData.correo,
      p_contrasena: formData.contrasena || null,
      p_tipousuario_id: parseInt(formData.tipousuario_id),
      p_departamento_id: formData.departamento_id ? parseInt(formData.departamento_id) : null,
      p_estado: formData.estadoadministrativo || 'Alta',
    })

    if (error && !data) {
      const esDuplicado =
        error.message.toLowerCase().includes('unique') ||
        error.message.toLowerCase().includes('duplicate')

      if (esDuplicado) {
        Swal.fire(
          'Error',
          esEdicion
            ? 'No se puede modificar el usuario: el correo ya está registrado por otro usuario.'
            : 'No se puede crear el usuario: el correo ya está registrado.',
          'error',
        )
      } else {
        throw error
      }
      return
    }

    Swal.fire({
      title: esEdicion ? 'Usuario Actualizado' : 'Usuario Creado',
      text: `Se ha guardado a ${formData.nombre} correctamente.`,
      icon: 'success',
      confirmButtonColor: '#1a6b2f',
    })

    cerrarModalForm()
    await cargarDatos()
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
    reverseButtons: true,
  })

  if (result.isConfirmed) {
    const { error } = await updateEq(
      'usuarios', // nombre de la tabla
      'id', // campo para eq
      user.id, // valor a comparar
      { estadoadministrativo: nuevoEstado }, // data a actualizar
    )

    // Si pasa de Alta -> Baja else si pasa de Baja -> Alta entonces cambiar Columna FechaBaja o FechaAlta con la fecha actual
    if (user.estadoadministrativo === 'Alta' && nuevoEstado === 'Baja') {
      const { error } = await updateEq('usuarios', 'id', user.id, {
        fechabaja: new Date().toISOString(),
      })

      if (error) {
        throw new Error('No se pudo marcar la fecha de baja: ' + error.message)
      }
    } else if (user.estadoadministrativo === 'Baja' && nuevoEstado === 'Alta') {
      const { error } = await updateEq('usuarios', 'id', user.id, {
        fechaalta: new Date().toISOString(),
      })

      if (!error) {
        cerrarModalVer()
        await cargarDatos()
        Swal.fire('¡Actualizado!', `El usuario ahora está dado de ${nuevoEstado}.`, 'success')
      } else {
        Swal.fire('Error', 'No se pudo actualizar el estado.', 'error')
      }
    }
  }
}
const cerrarSesion = () => {
  localStorage.removeItem('adminSession')
  router.push('/')
}
</script>

<style src="../assets/panelAdministrador.css" />

<style scoped>
.tabs-secciones {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tab-seccion {
  flex-shrink: 0;
  padding: 14px 29px;
  border: none;
  border-radius: 999px;
  background-color: #eceeed;
  color: #444;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.tab-seccion:hover {
  background-color: #dfe3e0;
}

.tab-seccion.activa {
  background-color: #1a6b2f;
  color: #fff;
}

.btn-eliminar:hover {
  background-color: #fdecea;
}

.tab-seccion:focus-visible {
  outline: 3px solid #1a6b2f;
  outline-offset: 2px;
}
</style>
