<template>
  <section class="mobile-layout">
    <main ref="mapContainer" class="map"></main>

    <!-- Buscador de zona: visible siempre que no esté el panel de formulario abierto -->
    <div class="buscador-zona" v-show="!panelAbierto || modoMapa">
      <div class="buscador-zona-fila">
        <div class="buscador-zona-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"
            class="buscador-zona-icono">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input v-model="queryZona" type="text" placeholder="Buscar colonia, dirección..." @keyup.enter="buscarZona"
            @input="onInputZona" />
          <button v-if="queryZona" class="buscador-zona-clear" @click="limpiarBusquedaZona">
            ✕
          </button>
        </div>
        <button class="btn-ubicacion-actual" @click="irAUbicacionActual">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="8" stroke-dasharray="2 2" />
          </svg>
        </button>
      </div>
      <ul v-if="sugerenciasZona.length" class="buscador-zona-sugerencias">
        <li v-for="s in sugerenciasZona" :key="s.place_id" @click="irASugerencia(s)">
          {{ s.display_name }}
        </li>
      </ul>
    </div>

    <aside class="zoom-controls">
      <button v-show="!panelAbierto || modoMapa" class="btn-zoom" @click="zoomIn">+</button>
      <button v-show="!panelAbierto || modoMapa" class="btn-zoom" @click="zoomOut">−</button>
    </aside>

    <button v-show="!panelAbierto || modoMapa" class="btn-ubicacion-actual" @click="irAUbicacionActual">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        <circle cx="12" cy="12" r="8" stroke-dasharray="2 2" />
      </svg>
    </button>

    <figure v-if="!panelAbierto || modoMapa" class="pin-fijo">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26S32 26 32 16C32 7.163 24.837 0 16 0z" fill="#1a6b2f"
          stroke="white" stroke-width="2" />
        <circle cx="16" cy="16" r="6" fill="white" />
      </svg>
      <div class="pin-sombra"></div>
    </figure>

    <button v-show="!panelAbierto" class="btn-regresar" @click="irA('/')">↩</button>
    <button v-show="!panelAbierto" class="btn-agregar" @click="abrirPanel">+</button>

    <!-- Panel formulario / modo mapa -->
    <section v-if="panelAbierto" class="panel" :class="modoMapa ? 'panel--mapa' : 'panel--expandido'">
      <div v-if="modoMapa" class="franja-mapa">
        <button class="btn-cerrar-mapa" @click="cancelarModoMapa">✕</button>
        <span class="handle-bar"></span>
        <h3 class="franja-titulo">Fija la dirección</h3>
        <p class="franja-sub">Mueve el mapa para seleccionar la ubicación</p>
        <button class="btn-confirmar-dir" @click="confirmarDireccion">Confirmar dirección</button>
      </div>

      <template v-else>
        <header class="panel-header">
          <div class="handle-bar"></div>
          <button class="btn-cerrar-panel" @click="abrirPanel">✕</button>
          <h2>Nuevo Reporte</h2>
        </header>

        <form class="panel-form" @submit.prevent="enviarReporte" @mousedown.stop @touchstart.stop>
          <label>¿A qué área corresponde tu reporte?</label>
          <select name="departamento" v-model="form.departamento_id" @change="onDepartamentoSeleccionado"
            :class="{ 'input-error': errores.departamento_id }">
            <option value="">Selecciona un departamento...</option>
            <option v-for="dep in departamentos.filter((d) => d.estado === 'Alta')" :key="dep.id" :value="dep.id">
              {{ dep.nombreamigable }}
            </option>
          </select>
          <label>Departamento al que corresponde:</label>
          <input type="text" :value="departamentos.find((d) => d.id === form.departamento_id)?.nombre || ''" disabled />
          <span v-if="errores.departamento_id" class="msg-error">{{
            errores.departamento_id
          }}</span>

          <label>¿Qué problema quieres reportar?</label>
          <select name="problema" v-model="form.problema_id" :class="{ 'input-error': errores.problema_id }"
            :disabled="!form.departamento_id">
            <option value="">
              {{
                form.departamento_id
                  ? 'Selecciona el problema...'
                  : 'Primero selecciona un departamento'
              }}
            </option>
            <option v-for="prob in problemas.filter((d) => d.estado === 'Alta')" :key="prob.id" :value="prob.id">
              {{ prob.nombreamigable }}
            </option>
          </select>
          <label>Problema al que corresponde:</label>
          <input type="text" :value="problemas.find((d) => d.id === form.problema_id)?.nombre || ''" disabled />
          <span v-if="errores.problema_id" class="msg-error">{{ errores.problema_id }}</span>
          <label>Descripción</label>
          <textarea name="descripcion" v-model="form.descripcion" rows="4" placeholder="Describe el problema..."
            maxlength="600" :class="{ 'input-error': errores.descripcion }"></textarea>
          <span v-if="errores.descripcion" class="msg-error">{{ errores.descripcion }}</span>
          <span class="contador" :class="{ limite: form.descripcion.length >= 600 }">
            {{ form.descripcion.length }}/600
          </span>

          <label>Nombre <span class="opcional">(Opcional)</span></label>
          <input name="nombre" v-model="form.nombre" type="text" placeholder="Si deseas, puedes dejarlo en blanco" />

          <label>Teléfono</label>
          <input name="telefono" v-model="form.telefono" type="tel" maxlength="10" minlength="10"
            placeholder="10 dígitos" @input="validarTelefono" :class="{ 'input-error': errores.telefono }" />
          <span v-if="errores.telefono" class="msg-error">{{ errores.telefono }}</span>

          <label>Correo Electrónico<span class="opcional">(Opcional, se usará para notificaciones del
              reporte)</span></label>
          <input name="correo" v-model="form.correo" type="email" placeholder="tu@correo.com"
            :class="{ 'input-error': errores.correo }" />
          <span v-if="errores.correo" class="msg-error">{{ errores.correo }}</span>

          <label>Domicilio del incidente</label>
          <div class="input-mapa-wrapper" :class="{ 'input-error': errores.domicilio }">
            <input name="domicilio" v-model="form.domicilio" type="text" placeholder="Calle y número"
              class="input-domicilio" />
            <button type="button" class="btn-abrir-mapa" @click="abrirModoMapa">
              <Map />
            </button>
          </div>
          <span v-if="errores.domicilio" class="msg-error">{{ errores.domicilio }}</span>

          <label>Referencias <span class="opcional">(Opcional)</span></label>
          <input name="referencias" v-model="form.referencias" type="text" placeholder="Entre calles, cerca de..." />

          <label>Foto</label>
          <div class="foto-wrapper">
            <div class="foto-actions">
              <label class="btn-foto" :class="{
                'input-error': errores.foto,
                'btn-disabled': !form.departamento_id || procesandoAI
              }" for="inputFotoFile">
                <Image />

                <span>
                  {{ form.foto ? 'Cambiar foto' : 'Seleccionar foto' }}
                </span>
              </label>

              <label class="btn-foto btn-foto-camara" :class="{
                'btn-disabled': !form.departamento_id
                  || procesandoAI
              }" for="inputFotoCamara">
                <Camera />
                <span>Tomar foto</span>
              </label>

            </div>

            <input id="inputFotoFile" ref="inputFoto" type="file" accept="image/*" class="input-foto-hidden"
              :disabled="!form.departamento_id || enviando || procesandoAI" @change="seleccionarFoto" />

            <input id="inputFotoCamara" ref="inputCamara" type="file" accept="image/*" capture="environment"
              class="input-foto-hidden" :disabled="!form.departamento_id || enviando || procesandoAI"
              @change="seleccionarFoto" />

            <div v-if="previewFoto" class="preview-foto-wrapper">
              <img :src="previewFoto" alt="Vista previa" class="preview-foto" />
            </div>

            <button type="button" class="link-evidencia" @click="mostrarModalConsejos = true">
              Cómo tomar tu evidencia correctamente...
            </button>

          </div>

          <span v-if="errores.foto" class="msg-error">
            {{ errores.foto }}
          </span>

          <!--<span class="validacion-AI" disable></span>-->

          <div class="terminos-check" :class="{ 'terminos-error': errores.terminos }">
            <input id="aceptaTerminos" v-model="aceptaTerminos" type="checkbox" @change="errores.terminos = ''" />
            <label for="aceptaTerminos">
              He leído y acepto los
              <button type="button" class="link-terminos" @click.prevent.stop="abrirTerminos">
                Términos y Condiciones
              </button>
              y el Aviso de Privacidad de GeoReporte, y doy mi consentimiento para el tratamiento de mis
              datos personales.
            </label>
          </div>
          <span v-if="errores.terminos" class="msg-error">{{ errores.terminos }}</span>

          <button name="enviar" type="submit" class="btn-enviar" :disabled="enviando">
            {{ enviando ? 'Enviando...' : 'Enviar Reporte' }}
          </button>
        </form>

      </template>
    </section>
  </section>
  <div ref="turnstileContainer"></div>
  <div v-if="mostrarModalTerminos" class="modal-overlay" @click.self="cerrarTerminos">
    <div class="modal-terminos" role="dialog" aria-modal="true" aria-labelledby="terminos-titulo">
      <header class="terminos-header">
        <div>
          <h3 id="terminos-titulo">Términos y Condiciones y Aviso de Privacidad</h3>
          <p>H. Ayuntamiento de Culiacán · GeoReporte</p>
        </div>
        <button type="button" class="terminos-cerrar" aria-label="Cerrar" @click="cerrarTerminos">
          ✕
        </button>
      </header>

      <div class="terminos-body">
        <p class="terminos-aviso">
          Antes de enviar su reporte, le informamos que los datos que proporcione serán
          recopilados, almacenados y analizados por el H. Ayuntamiento de Culiacán para las
          finalidades descritas a continuación.
        </p>

        <section v-for="s in seccionesTerminos" :key="s.titulo" class="terminos-seccion">
          <h4>{{ s.titulo }}</h4>
          <p v-for="(p, i) in s.parrafos" :key="i">{{ p }}</p>
          <ul v-if="s.lista">
            <li v-for="(item, i) in s.lista" :key="i">{{ item }}</li>
          </ul>
        </section>

        <p class="terminos-fecha">Última actualización: noviembre de 2026.</p>
      </div>

      <footer class="terminos-footer">
        <button type="button" class="terminos-btn-sec" @click="cerrarTerminos">Cerrar</button>
        <button type="button" class="terminos-btn-pri" @click="aceptarDesdeModal">
          He leído y acepto
        </button>
      </footer>
    </div>
  </div>
  <div v-if="mostrarModalConsejos" class="modal-overlay" @click.self="mostrarModalConsejos = false">
    <div class="modal-consejos">

      <h3>Consejos para tomar evidencia</h3>

      <ul>
        <li>Captura claramente el problema reportado.</li>

        <li>Mantén la cámara estable para evitar fotos borrosas.</li>

        <li>Procura contar con buena iluminación.</li>

        <li>Muestra el contexto alrededor del incidente.</li>

        <li>Evita tomar la fotografía demasiado lejos.</li>

        <li>No cubras el lente con los dedos.</li>

        <li>Verifica la imagen antes de enviarla.</li>
      </ul>

      <button type="button" class="btn-cerrar-consejos" @click="mostrarModalConsejos = false">
        Entendido
      </button>

    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Iconos de PrimeVue
import Image from '@primeicons/vue/image';
import Camera from '@primeicons/vue/camera';
import Map from '@primeicons/vue/map';

import Swal from 'sweetalert2';

import {
  obtenerDepartamentosOrdenadosPorId,
  obtenerProblemasPorDepartamentoID,
  uploadFoto,
  crearReporte,
  crearDetalleReporte,
  getPublicUrl,
} from '../services/supabaseController'
import { validarAI } from '../services/geoAIController'
import { enviarCorreoCreacionReporte } from '../services/gmailController'

const mapContainer = ref<HTMLElement | null>(null)
const map = ref<L.Map | null>(null)
const inputFoto = ref<HTMLInputElement | null>(null)
const modoMapa = ref(false)
const volandoAUbicacion = ref(false)

const panelAbierto = ref(true)

const enviando = ref(false)
const procesandoAI = ref(false)
const errores = ref<Record<string, string>>({})

const previewFoto = ref('')
const mostrarModalConsejos = ref(false)

const aceptaTerminos = ref(false)
const mostrarModalTerminos = ref(false)

const abrirTerminos = () => {
  mostrarModalTerminos.value = true
}

const cerrarTerminos = () => {
  mostrarModalTerminos.value = false
}

// Desde el modal: marca la casilla y cierra
const aceptarDesdeModal = () => {
  aceptaTerminos.value = true
  errores.value.terminos = ''
  mostrarModalTerminos.value = false
}

const seccionesTerminos = [
  {
    titulo: '1. Objeto y aceptación',
    parrafos: [
      'GeoReporte es la plataforma ciudadana del H. Ayuntamiento de Culiacán para el registro, canalización y seguimiento de reportes de servicios públicos municipales. Al marcar la casilla de aceptación y enviar su reporte, usted declara haber leído y comprendido estos Términos y Condiciones y el Aviso de Privacidad, y otorga su consentimiento libre e informado para el tratamiento de sus datos en los términos aquí descritos.',
    ],
  },
  {
    titulo: '2. Responsable del tratamiento',
    parrafos: [
      'El responsable del tratamiento de sus datos personales es el H. Ayuntamiento de Culiacán, Sinaloa, a través de GeoReporte, con domicilio en Avenida del Waja #404, Colonia Profe Ponga me Zien, C.P. 80000, Culiacán, Sinaloa.',
    ],
  },
  {
    titulo: '3. Datos que se recopilan',
    parrafos: ['Al enviar un reporte, la plataforma recopila los siguientes datos:'],
    lista: [
      'Datos de contacto: teléfono (obligatorio), nombre y correo electrónico (opcionales).',
      'Datos de ubicación: domicilio del incidente, coordenadas geográficas del punto seleccionado en el mapa y referencias que usted proporcione.',
      'Contenido del reporte: departamento y problemática seleccionados, descripción del incidente y fotografía de evidencia.',
      'Datos técnicos: información necesaria para la verificación de seguridad contra uso automatizado y fecha y hora del registro.',
    ],
  },
  {
    titulo: '4. Finalidades del tratamiento',
    parrafos: ['Sus datos serán utilizados para las siguientes finalidades:'],
    lista: [
      'Registrar, canalizar y dar atención al reporte ciudadano por el área municipal competente.',
      'Contactarle para aclaraciones, seguimiento y para notificarle por correo electrónico los cambios de estado de su reporte.',
      'Analizar la información de manera estadística y geográfica para identificar zonas y problemáticas recurrentes, planear recursos y mejorar la prestación de los servicios públicos.',
      'Validar y clasificar las fotografías mediante herramientas de inteligencia artificial, y mejorar la precisión de dicha clasificación.',
      'Prevenir el uso indebido, los reportes falsos y el uso automatizado de la plataforma.',
    ],
  },
  {
    titulo: '5. Uso de inteligencia artificial',
    parrafos: [
      'La fotografía que usted adjunte será analizada por un sistema de inteligencia artificial para verificar que corresponda a la problemática y al departamento seleccionados. El resultado es un apoyo para el personal municipal y no sustituye su valoración. Las imágenes y las retroalimentaciones del personal podrán utilizarse para mejorar este sistema.',
    ],
  },
  {
    titulo: '6. Comunicación de datos',
    parrafos: [
      'Sus datos podrán ser compartidos con las dependencias municipales que intervengan en la atención del reporte y, cuando el asunto corresponda a otra instancia, con dependencias externas a las que el reporte sea turnado. Asimismo, intervienen proveedores tecnológicos que prestan servicios de almacenamiento, envío de correo electrónico, verificación de seguridad y mapas. Al seleccionar una ubicación, sus coordenadas se consultan en un servicio de mapas de terceros (OpenStreetMap) para obtener la dirección.',
      'Fuera de estos supuestos, sus datos no serán transferidos, salvo requerimiento de autoridad competente debidamente fundado y motivado.',
    ],
  },
  {
    titulo: '7. Datos opcionales y contenido de la evidencia',
    parrafos: [
      'El nombre y el correo electrónico son opcionales; si no proporciona un correo, no recibirá notificaciones por ese medio. Le pedimos evitar que sus fotografías muestren rostros, placas u otros datos de terceras personas y no incluir información sensible en la descripción del reporte.',
    ],
  },
  {
    titulo: '8. Uso adecuado de la plataforma',
    parrafos: [
      'Usted se compromete a proporcionar información veraz y a utilizar GeoReporte únicamente para reportar problemáticas reales de servicios públicos. Los reportes falsos, ofensivos, duplicados de manera intencional o con contenido ilícito podrán ser rechazados sin responsabilidad para el Ayuntamiento, sin perjuicio de las acciones legales que correspondan. El envío de un reporte no garantiza un plazo determinado de atención.',
    ],
  },
  {
    titulo: '9. Conservación',
    parrafos: [
      'Sus datos se conservarán durante el tiempo necesario para atender el reporte y cumplir con las obligaciones legales y de archivo aplicables. La información estadística o disociada podrá conservarse por tiempo indefinido.',
    ],
  },
  {
    titulo: '10. Derechos de acceso, rectificación, cancelación y oposición',
    parrafos: [
      'Usted puede ejercer sus derechos de acceso, rectificación, cancelación y oposición (ARCO) ante la Unidad de Transparencia del Ayuntamiento de Culiacán, en [domicilio, correo electrónico y horario de atención], conforme a la normatividad aplicable en materia de protección de datos personales.',
    ],
  },
  {
    titulo: '11. Cambios a este documento',
    parrafos: [
      'El Ayuntamiento podrá modificar estos Términos y Condiciones. Las modificaciones se publicarán en esta plataforma y serán aplicables a los reportes enviados a partir de su publicación.',
    ],
  },
]

const inputCamara = ref<HTMLInputElement | null>(null)

// --- TURNSTILE ---
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string
const turnstileContainer = ref<HTMLElement | null>(null)
let widgetId: string | null = null
let resolverToken: ((token: string) => void) | null = null
let rechazarToken: ((error: Error) => void) | null = null

// Espera a que cargue el script de Cloudflare
const esperarTurnstile = (timeoutMs = 8000): Promise<any> =>
  new Promise((resolve, reject) => {
    const inicio = Date.now()
    const revisar = () => {
      const t = (window as any).turnstile
      if (t) return resolve(t)
      if (Date.now() - inicio > timeoutMs) {
        return reject(new Error('No se pudo cargar la verificación de seguridad'))
      }
      setTimeout(revisar, 100)
    }
    revisar()
  })

// Genera un token nuevo bajo demanda (uno por cada envío)
const obtenerTokenTurnstile = async (): Promise<string> => {
  const turnstile = await esperarTurnstile()
  if (widgetId === null) {
    throw new Error('La verificación de seguridad no está lista. Recarga la página.')
  }

  return new Promise<string>((resolve, reject) => {
    const limite = setTimeout(() => {
      resolverToken = null
      rechazarToken = null
      reject(new Error('La verificación de seguridad tardó demasiado. Intenta de nuevo.'))
    }, 20000)

    resolverToken = (token) => {
      clearTimeout(limite)
      resolve(token)
    }
    rechazarToken = (error) => {
      clearTimeout(limite)
      reject(error)
    }

    turnstile.reset(widgetId) // descarta cualquier token anterior
    turnstile.execute(widgetId) // pide uno nuevo
  })
}

// --- CATÁLOGOS SUPABASE ---
const departamentos = ref<any[]>([])
const problemas = ref<any[]>([])

const CULIACAN_BOUNDS = {
  minLat: 24.58,
  maxLat: 25.02,
  minLng: -107.6,
  maxLng: -107.1,
}

const dentroDeculiacan = (lat: number, lng: number): boolean => {
  return (
    lat >= CULIACAN_BOUNDS.minLat &&
    lat <= CULIACAN_BOUNDS.maxLat &&
    lng >= CULIACAN_BOUNDS.minLng &&
    lng <= CULIACAN_BOUNDS.maxLng
  )
}

const form = ref({
  departamento_id: '',
  problema_id: '',
  descripcion: '',
  nombre: '',
  telefono: '',
  domicilio: '',
  referencias: '',
  foto: null as File | null,
  latitud: 0,
  longitud: 0,
  correo: '',
  fotoTipoID: null as number | null,
  mensajeAI: '' as string | null,
})

// 1. Cargar departamentos al iniciar
const cargarDepartamentos = async () => {
  const { data, error } = await obtenerDepartamentosOrdenadosPorId()
  if (!error && data) {
    departamentos.value = data
  } else {
    console.error('Error al cargar departamentos:', error)
  }
}

// 2. Cargar problemas al seleccionar un departamento
const onDepartamentoSeleccionado = async () => {
  form.value.problema_id = ''
  problemas.value = []
  errores.value.departamento_id = '' // Limpiar error visual si elige algo
  form.value.foto = null
  previewFoto.value = ''
  //document.querySelector('.validacion-AI')?.replaceChildren() // Limpiar mensaje de validación AI


  if (!form.value.departamento_id) return



  const { data, error } = await obtenerProblemasPorDepartamentoID(form.value.departamento_id)

  if (!error && data) {
    problemas.value = data
  } else {
    // Manejo de error: mostrar alerta al usuario
    Swal.fire('Error', 'No se pudieron cargar los problemas para el departamento seleccionado. Intenta de nuevo más tarde.', 'error')
  }
}

// Configuración del Mapa (Leaflet)
const onResize = () => setTimeout(() => map.value?.invalidateSize(), 100)

onMounted(() => {
  document.documentElement.style.overflow = 'hidden'
  document.documentElement.style.height = '100%'
  document.body.style.overflow = 'hidden'
  document.body.style.height = '100%'
  document.body.style.margin = '0'
  document.body.style.padding = '0'

  window.addEventListener('resize', onResize)

  // Cargar catálogos de base de datos
  cargarDepartamentos()

  if (!mapContainer.value) return
  map.value = L.map(mapContainer.value, { zoomControl: false }).setView([24.8091, -107.394], 15)

  map.value.on('moveend', () => {
    if (!volandoAUbicacion.value) queryZona.value = ''
    volandoAUbicacion.value = false
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map.value)

  setTimeout(() => map.value?.invalidateSize?.(), 100)

  esperarTurnstile()
    .then((turnstile) => {
      if (!turnstileContainer.value) return
      widgetId = turnstile.render(turnstileContainer.value, {
        sitekey: TURNSTILE_SITE_KEY,
        execution: 'execute', // no genera token hasta que se pida
        callback: (token: string) => {
          resolverToken?.(token)
          resolverToken = null
          rechazarToken = null
        },
        'error-callback': () => {
          rechazarToken?.(new Error('Falló la verificación de seguridad. Intenta de nuevo.'))
          resolverToken = null
          rechazarToken = null
        },
        'timeout-callback': () => {
          rechazarToken?.(new Error('La verificación de seguridad expiró. Intenta de nuevo.'))
          resolverToken = null
          rechazarToken = null
        },
      })
    })
    .catch((e) => console.error(e))
})

onUnmounted(() => {
  document.documentElement.style.overflow = ''
  document.documentElement.style.height = ''
  document.body.style.overflow = ''
  document.body.style.height = ''
  window.removeEventListener('resize', onResize)

  if (widgetId !== null) (window as any).turnstile?.remove(widgetId)
})

const obtenerDireccionCentro = async () => {
  if (!map.value) return
  const centro = map.value.getCenter()
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${centro.lat}&lon=${centro.lng}`,
      { headers: { Accept: 'application/json' } },
    )
    const data = await res.json()
    if (data?.display_name) form.value.domicilio = data.display_name
    form.value.latitud = centro.lat
    form.value.longitud = centro.lng
  } catch (e) {
    console.error(e)
  }
}

const abrirModoMapa = () => {
  modoMapa.value = true
  setTimeout(() => map.value?.invalidateSize(), 400)
}

const cancelarModoMapa = () => {
  modoMapa.value = false
  setTimeout(() => map.value?.invalidateSize(), 400)
}

const confirmarDireccion = async () => {
  if (!map.value) return
  const centro = map.value.getCenter()
  if (!dentroDeculiacan(centro.lat, centro.lng)) {
    alert(
      'La ubicación seleccionada está fuera de Culiacán. Por favor selecciona un punto dentro del municipio.',
    )
    return
  }
  await obtenerDireccionCentro()
  modoMapa.value = false
  setTimeout(() => map.value?.invalidateSize(), 400)
}

import { useRouter } from 'vue-router'

const router = useRouter()

const irA = (ruta: string) => {
  router.push(ruta)
  // Recargar la página para limpiar el estado del formulario
  setTimeout(() => {
    window.location.reload()
  }, 100)
}

const irAUbicacionActual = () => {
  if (!navigator.geolocation) {
    alert('Tu navegador no soporta geolocalización')
    return
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords
      volandoAUbicacion.value = true
      map.value?.flyTo([latitude, longitude], 16, { duration: 1 })

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          { headers: { Accept: 'application/json' } },
        )
        const data = await res.json()
        if (data?.address) {
          const a = data.address
          const direccion = [
            a.road,
            a.house_number,
            a.neighbourhood || a.suburb || a.quarter,
            a.city || a.town,
          ]
            .filter(Boolean)
            .join(', ')
          queryZona.value = direccion
        }
      } catch { }
    },
    () => {
      alert('No se pudo obtener tu ubicación')
    },
    {
      enableHighAccuracy: true, // <-- esto
      timeout: 10000,
      maximumAge: 0,
    },
  )
}
const zoomIn = () => map.value?.zoomIn()
const zoomOut = () => map.value?.zoomOut()

const abrirPanel = () => {
  panelAbierto.value = !panelAbierto.value
  if (panelAbierto.value) {
    if (queryZona.value) form.value.domicilio = queryZona.value
    modoMapa.value = false
    setTimeout(() => map.value?.invalidateSize(), 400)
  }
}

const seleccionarFoto = async (e: Event) => {
  const submitBtn = document.getElementsByName('enviar')[0] as HTMLButtonElement

  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.textContent = 'Estamos validando tu evidencia, por favor espera...'
  }

  const input = e.target as HTMLInputElement

  if (input.files?.[0]) {
    const archivo = input.files[0]
    form.value.foto = archivo
    errores.value.foto = ''
    previewFoto.value = URL.createObjectURL(archivo)
    procesandoAI.value = true
    try {
      const resultado = await validarConAi(archivo)
      if (resultado === 2) {
        submitBtn.disabled = false
        submitBtn.textContent = 'Enviar Reporte'
      }
    } finally {
      procesandoAI.value = false
    }
  }

  if (submitBtn) {
    submitBtn.disabled = false
    submitBtn.textContent = 'Enviar Reporte'
  }
}

const obtenerSlugDepartamento = (id: string | number): string => {
  const depId = Number(id) // Nos aseguramos de evaluarlo como número

  switch (depId) {
    case 1:
      return 'limpieza'
    case 2:
      return 'parques'
    case 3:
      return 'alumbrado'
    case 4:
      return 'mercados'
    case 5:
      return 'panteones'
    case 6:
      return 'calles'
    case 7:
      return 'drenaje'
    default:
      return 'calles'
  }
}

const validarConAi = async (file: File) => {
  //const spanValidacionAI = document.querySelector('.validacion-AI') as HTMLSpanElement

  //if (spanValidacionAI) {
  //  spanValidacionAI.textContent = `Validando tu foto con AI...`
  //  spanValidacionAI.style.color = '#000000'
  //}

  const departamentoId = form.value.departamento_id
  const departamentoSlug = obtenerSlugDepartamento(departamentoId)
  const resultadoAI = await validarAI(file, departamentoSlug)

  //if (spanValidacionAI) {
  if (resultadoAI) {
    // Guardar los datos de la IA en nuestro state del formulario
    form.value.fotoTipoID = resultadoAI.type;

    if (resultadoAI.type === 2) {
      form.value.mensajeAI = 'Ocurrio un error al validar la imagen, es posiblemente incorrecta';
    } else {
      form.value.mensajeAI = resultadoAI.data.message;
    }
    //spanValidacionAI.textContent = `${resultadoAI.data.message}`
    //spanValidacionAI.style.color = resultadoAI.type === 0 ? '#008998' : '#FF0000'
    return resultadoAI.type

  } else {
    form.value.fotoTipoID = 2; // 2 = Error según tu interfaz
    form.value.mensajeAI = 'Ocurrio un error al validar la imagen, es posiblemente incorrecta';
    return 2
    //spanValidacionAI.textContent = 'Ocurrio un error al validar la imagen, es posiblemente incorrecta'
    //spanValidacionAI.style.color = '#FF0000'
  }
  //}
}

const limpiarFormulario = () => {
  form.value = {
    departamento_id: '',
    problema_id: '',
    descripcion: '',
    nombre: '',
    telefono: '',
    domicilio: '',
    referencias: '',
    foto: null,
    latitud: 0,
    longitud: 0,
    correo: '',
    fotoTipoID: null,
    mensajeAI: '',
  }
  problemas.value = []
  errores.value = {}
  previewFoto.value = ''
  aceptaTerminos.value = false

  if (inputCamara.value) inputCamara.value.value = ''

  if (inputFoto.value) inputFoto.value.value = ''
}

const enviarReporte = async () => {
  if (enviando.value) return

  errores.value = {}
  let esValido = true

  // --- Validaciones Obligatorias ---
  if (!form.value.departamento_id) {
    errores.value.departamento_id = 'Selecciona el departamento'
    esValido = false
  }
  if (!form.value.problema_id) {
    errores.value.problema_id = 'Selecciona el problema'
    esValido = false
  }
  if (!form.value.descripcion.trim()) {
    errores.value.descripcion = 'La descripción es obligatoria'
    esValido = false
  }

  if (!form.value.telefono) {
    errores.value.telefono = 'El teléfono es obligatorio'
    esValido = false
  } else if (!/^\d{10}$/.test(form.value.telefono)) {
    errores.value.telefono = 'Ingresa un número válido de 10 dígitos'
    esValido = false
  }

  if (!form.value.latitud || !form.value.longitud || !form.value.domicilio.trim()) {
    errores.value.domicilio = 'Por favor selecciona una ubicación en el mapa'
    esValido = false
  } else if (!dentroDeculiacan(form.value.latitud, form.value.longitud)) {
    errores.value.domicilio = 'La ubicación está fuera de Culiacán'
    esValido = false
  }

  if (!form.value.foto) {
    errores.value.foto = 'Debes adjuntar una foto de evidencia'
    esValido = false
  }

  if (form.value.foto && form.value.fotoTipoID == null) {
    errores.value.foto = 'La foto no pudo ser validada, por favor intentalo de nuevo.'
    esValido = false
  }

  if (form.value.foto && !form.value.mensajeAI) {
    errores.value.foto = 'La foto no pudo ser validada, por favor intentalo de nuevo'
    esValido = false
  }

  if (!aceptaTerminos.value) {
    errores.value.terminos = 'Debes aceptar los Términos y Condiciones para enviar tu reporte'
    esValido = false
  }

  if (!esValido) return

  //Desactivar el botón de enviar mientras se procesa la solicitud
  const submitBtn = document.querySelector('.btn-enviar') as HTMLButtonElement
  if (submitBtn) {
    submitBtn.textContent = 'Estamos validando tu evidencia, por favor espera...'
    submitBtn.disabled = true
  }

  // Generar el folio del reporte
  const depTresLetras = departamentos.value
    .find((d) => d.id === form.value.departamento_id)
    ?.nombre.substring(0, 3)
    .toUpperCase()
  const probTresLetras = problemas.value
    .find((p) => p.id === form.value.problema_id)
    ?.nombre.substring(0, 3)
    .toUpperCase()
  const fechaCuatroDigitosYear = new Date().getFullYear().toString().slice(-4)
  const fechaMes = (new Date().getMonth() + 1).toString().padStart(2, '0')
  const fechaDia = new Date().getDate().toString().padStart(2, '0')
  const fechaFormateada = `${fechaCuatroDigitosYear}${fechaMes}${fechaDia}`
  const horaDosDigitos = new Date().getHours().toString().padStart(2, '0')
  const minutosDosDigitos = new Date().getMinutes().toString().padStart(2, '0')
  const segundosDosDigitos = new Date().getSeconds().toString().padStart(2, '0')
  const horaFormateada = `${horaDosDigitos}${minutosDosDigitos}${segundosDosDigitos}`
  const randomCincoAlfanumerico = Math.random().toString(36).substring(2, 7).toUpperCase()
  const folioGenerado = `${depTresLetras}-${probTresLetras}-${fechaFormateada}-${horaFormateada}-${randomCincoAlfanumerico}`

  enviando.value = true

  try {
    // 0. Token de seguridad (se valida en el backend al crear el reporte)
    const turnstileToken = await obtenerTokenTurnstile()

    let fotoUrlFinal = ''

    // 1. Subir la foto a Supabase Storage
    if (form.value.foto) {
      const file = form.value.foto
      const fileExt = file.name.split('.').pop()
      // Generamos un nombre único para evitar que fotos con el mismo nombre se sobreescriban
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `evidencias/${fileName}` // Se guardará dentro de una carpeta "evidencias"

      const { data, error: uploadError } = await uploadFoto(filePath, file)

      if (uploadError) throw new Error('No se pudo subir la imagen: ' + uploadError.message)

      // Obtener la URL pública de la foto recién subida
      const { data: publicUrlData, error } = await getPublicUrl(filePath)

      if (error) throw new Error(error.message)

      fotoUrlFinal = publicUrlData.publicUrl
    }

    // 2. Insertar los datos en la tabla 'reportes'
    const { data, error: insertReporteError } = await crearReporte({
      folio: folioGenerado,
      departamento_id: form.value.departamento_id,
      problema_id: form.value.problema_id,
      descripcion: form.value.descripcion.trim(),
      nombre: form.value.nombre ? form.value.nombre.trim() : 'Ciudadano Honorable',
      telefono: form.value.telefono,
      correo: form.value.correo.trim(),
      domicilio: form.value.domicilio.trim(),
      referencias: form.value.referencias ? form.value.referencias.trim() : null,
      foto_url: fotoUrlFinal,
      fotoTipoID: form.value.fotoTipoID,
      mensajeAI: form.value.mensajeAI,
      turnstileToken,
    })

    // 3. Insertar los datos en la tabla 'reportesExistentes'
    const { error: insertReporteExistenteError } = await crearDetalleReporte({
      folio: folioGenerado,
      estado_id: 1,
    })

    if (insertReporteError)
      throw new Error('Error al guardar en base de datos: ' + insertReporteError.message)
    if (insertReporteExistenteError)
      throw new Error('Error al guardar en base de datos: ' + insertReporteExistenteError.message)

    // Enviar correo por Gmail de la Creacion del Reporte
    const correoData = {
      folio: folioGenerado,
      departamento: departamentos.value.find((d) => d.id === form.value.departamento_id)?.nombre || '',
      problema: problemas.value.find((p) => p.id === form.value.problema_id)?.nombre || '',
      descripcion: form.value.descripcion.trim(),
      nombre: form.value.nombre ? form.value.nombre.trim() : 'Ciudadano Honorable',
      telefono: form.value.telefono,
      correo: form.value.correo.trim(),
      domicilio: form.value.domicilio.trim(),
      referencias: form.value.referencias ? form.value.referencias.trim() : null,
    }

    if (!correoData.correo) {
      console.warn('No se proporcionó correo electrónico para enviar la notificación del reporte.')
    } else {
      const resultadoGmail = await enviarCorreoCreacionReporte(correoData)

      if (!resultadoGmail.ok) {
        console.error('Error al enviar:', resultadoGmail.mensaje)
        console.error('Error detallado:', resultadoGmail.error)
      }
    }

    mostrarModalReporteExitoso({
      folio: folioGenerado,
      departamento_id: form.value.departamento_id,
      problema_id: form.value.problema_id,
    })
    limpiarFormulario()
    panelAbierto.value = false
  } catch (error: any) {
    console.error('Error detallado:', error)
    alert(error.message || 'Error de conexión al enviar el reporte')
  } finally {
    enviando.value = false
    const submitBtn = document.querySelector('.btn-enviar') as HTMLButtonElement
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.textContent = 'Enviar Reporte'
    }
  }
}

// Mostrar modal de reporte exitoso
const mostrarModalReporteExitoso = (reporte: any) => {
  const escapar = (t: string) =>
    String(t ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
    )

  const departamento = escapar(
    departamentos.value.find((d) => d.id === reporte.departamento_id)?.nombre || 'No disponible',
  )
  const problema = escapar(
    problemas.value.find((p) => p.id === reporte.problema_id)?.nombre || 'No disponible',
  )
  const folio = escapar(reporte.folio)

  const ICONO_COPIAR = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
  const ICONO_CHECK = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`

  const modal = document.createElement('div')
  modal.className = 'modal-reporte-exitoso'
  modal.innerHTML = `
    <div class="exito-card" role="dialog" aria-modal="true" aria-labelledby="exito-titulo">
      <div class="exito-header">
        <div class="exito-icono">${ICONO_CHECK}</div>
        <h2 id="exito-titulo">Reporte enviado con éxito</h2>
        <p>Gracias por ayudarnos a mejorar Culiacán.</p>
      </div>

      <div class="exito-body">
        <span class="exito-label">Tu número de folio</span>
        <div class="exito-folio">
          <code id="exito-folio-texto">${folio}</code>
          <button type="button" id="copiar-folio" class="exito-copiar" title="Copiar folio" aria-label="Copiar folio">
            ${ICONO_COPIAR}
          </button>
        </div>
        <p class="exito-aviso" id="exito-aviso">Guárdalo para consultar el estado de tu reporte.</p>

        <dl class="exito-datos">
          <div><dt>Departamento</dt><dd>${departamento}</dd></div>
          <div><dt>Problema</dt><dd>${problema}</dd></div>
        </dl>
      </div>

      <div class="exito-footer">
        <button type="button" id="cerrar-modal" class="exito-cerrar">Cerrar</button>
      </div>
    </div>
  `
  document.body.appendChild(modal)

  const cerrar = () => {
    if (modal.parentNode) document.body.removeChild(modal)
  }

  modal.querySelector('#cerrar-modal')!.addEventListener('click', cerrar)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrar()
  })

  const copiarBtn = modal.querySelector('#copiar-folio') as HTMLButtonElement
  const aviso = modal.querySelector('#exito-aviso') as HTMLElement
  const avisoOriginal = aviso.textContent

  copiarBtn.addEventListener('click', async () => {
    let ok = false
    try {
      await navigator.clipboard.writeText(reporte.folio)
      ok = true
    } catch {
      // Respaldo para navegadores sin clipboard API o sin HTTPS
      const temp = document.createElement('textarea')
      temp.value = reporte.folio
      temp.style.position = 'fixed'
      temp.style.opacity = '0'
      document.body.appendChild(temp)
      temp.select()
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
      document.body.removeChild(temp)
    }

    aviso.textContent = ok
      ? '¡Folio copiado al portapapeles!'
      : 'No se pudo copiar. Selecciónalo y cópialo manualmente.'
    aviso.classList.toggle('exito-aviso--ok', ok)
    if (ok) {
      copiarBtn.innerHTML = ICONO_CHECK
      copiarBtn.classList.add('copiado')
    }
    setTimeout(() => {
      aviso.textContent = avisoOriginal
      aviso.classList.remove('exito-aviso--ok')
      copiarBtn.innerHTML = ICONO_COPIAR
      copiarBtn.classList.remove('copiado')
    }, 2500)
  })
}

// Validación en tiempo real del teléfono
const validarTelefono = (e: Event) => {
  const target = e.target as HTMLInputElement
  // Eliminar cualquier carácter que no sea número
  target.value = target.value.replace(/[^0-9]/g, '')
  form.value.telefono = target.value

  // Validación de longitud
  if (form.value.telefono.length && form.value.telefono.length !== 10) {
    errores.value.telefono = 'El teléfono debe tener exactamente 10 dígitos'
  } else {
    errores.value.telefono = ''
  }
}

// ── Buscador de zona ──────────────────────────────────
const queryZona = ref('')
const folioBusqueda = ref('')
const reporteEncontrado = ref<any | null>(null)
const sugerenciasZona = ref<any[]>([])
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const onInputZona = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!queryZona.value.trim()) {
    sugerenciasZona.value = []
    return
  }
  debounceTimer = setTimeout(buscarZona, 400)
}

const buscarZona = async () => {
  if (!queryZona.value.trim()) return
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryZona.value)}&limit=6&countrycodes=mx`,
      { headers: { Accept: 'application/json' } },
    )
    sugerenciasZona.value = await res.json()
  } catch {
    sugerenciasZona.value = []
  }
}

const irASugerencia = (s: any) => {
  sugerenciasZona.value = []
  queryZona.value = s.display_name
  map.value?.flyTo([parseFloat(s.lat), parseFloat(s.lon)], 16, { duration: 1 })
}

const limpiarBusquedaZona = () => {
  queryZona.value = ''
  sugerenciasZona.value = []
}

//Necesario para las pruebas unitarias
defineExpose({
  form,
  errores,
  enviando,
  departamentos,
  problemas,
  map,
  modoMapa,
  queryZona,
  folioBusqueda,
  reporteEncontrado,
  panelAbierto,
  dentroDeculiacan,
  enviarReporte,
  confirmarDireccion,
  seleccionarFoto,
  onDepartamentoSeleccionado,
  aceptaTerminos,
})
</script>

<style scoped>
.foto-actions {
  display: flex;
  gap: 12px;
}

.btn-foto {
  flex: 1;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  padding: 12px;

  border-radius: 12px;

  background: var(--dorado);
  color: var(--tinto);

  cursor: pointer;
  font-weight: 600;

  transition: .2s;
}

.btn-foto-camara {
  background: var(--dorado);
}

.btn-disabled {
  opacity: .5;
  cursor: not-allowed;
  pointer-events: none;
}

.preview-foto-wrapper {
  margin-top: 12px;
}

.preview-foto {
  width: 100%;
  max-height: 280px;

  object-fit: cover;

  border-radius: 12px;

  border: 2px solid #e5e7eb;
}

.link-evidencia {
  margin-top: 10px;

  background: none;
  border: none;

  color: var(--tinto-oscuro);

  font-size: 14px;
  font-weight: 600;

  cursor: pointer;

  text-decoration: underline;
}

.modal-overlay {
  position: fixed;
  inset: 0;

  background: rgba(0, 0, 0, .55);

  display: flex;
  align-items: center;
  justify-content: center;

  z-index: 99999;
}

.modal-consejos {
  width: 90%;
  max-width: 420px;

  background: white;

  border-radius: 16px;

  padding: 24px;
}

.modal-consejos h3 {
  margin-bottom: 16px;
}

.modal-consejos ul {
  padding-left: 18px;
}

.modal-consejos li {
  margin-bottom: 10px;
}

.btn-cerrar-consejos {
  width: 100%;

  margin-top: 16px;

  padding: 12px;

  border: none;

  border-radius: 10px;

  background: var(--tinto);

  color: white;

  cursor: pointer;
}

.terminos-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 14px 0 6px;
  padding: 12px;
  background: #faf8f5;
  border: 1px solid #e5e0da;
  border-radius: 10px;
}
.terminos-check input[type='checkbox'] {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin: 2px 0 0;
  accent-color: #621132;
  cursor: pointer;
}
.terminos-check label {
  display: block;
  margin: 0;
  font-size: 0.85rem;
  font-weight: 400;
  line-height: 1.5;
  color: #444;
  cursor: pointer;
}
.terminos-error {
  border-color: #e74c3c;
  background: #fdf3f2;
}

/* Enlace azul subrayado */
.link-terminos {
  display: inline;
  padding: 0;
  background: none;
  border: none;
  font: inherit;
  font-weight: 600;
  color: #1a5fb4;
  text-decoration: underline;
  cursor: pointer;
}
.link-terminos:hover { color: #0d3c7a; }

/* Modal */
.modal-terminos {
  display: flex;
  flex-direction: column;
  width: 92%;
  max-width: 640px;
  max-height: 88vh;
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
}
.terminos-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px;
  background: #621132;
  color: #fff;
  border-bottom: 4px solid #d5c98a;
}
.terminos-header h3 { margin: 0 0 4px; font-size: 1.05rem; line-height: 1.3; }
.terminos-header p { margin: 0; font-size: 0.8rem; opacity: 0.9; }
.terminos-cerrar {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.85;
}
.terminos-cerrar:hover { opacity: 1; }

.terminos-body {
  flex: 1;
  padding: 18px 20px;
  overflow-y: auto;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #333;
}
.terminos-aviso {
  margin: 0 0 16px;
  padding: 12px 14px;
  background: #f5e9ee;
  border-left: 4px solid #621132;
  border-radius: 6px;
}
.terminos-seccion { margin-bottom: 16px; }
.terminos-seccion h4 { margin: 0 0 6px; font-size: 0.95rem; color: #621132; }
.terminos-seccion p { margin: 0 0 8px; text-align: justify; }
.terminos-seccion ul { margin: 0 0 8px; padding-left: 20px; }
.terminos-seccion li { margin-bottom: 4px; }
.terminos-fecha { margin: 8px 0 0; font-size: 0.8rem; color: #888; }

.terminos-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  background: #fafafa;
  border-top: 1px solid #eee;
}
.terminos-btn-sec,
.terminos-btn-pri {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.terminos-btn-sec { background: #e0e0e0; color: #333; }
.terminos-btn-pri { background: #621132; color: #fff; }
.terminos-btn-pri:hover { background: #4a0e2c; }

@media (max-width: 480px) {
  .terminos-footer { flex-direction: column-reverse; }
  .terminos-footer button { width: 100%; }
}
</style>
