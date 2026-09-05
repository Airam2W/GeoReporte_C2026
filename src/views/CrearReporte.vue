<!-- <template>
  <div>
    <h1>Interfaz de crear reportes</h1>
  </div>
</template>

<script setup lang="ts">



</script>

<style>

h1 {
  font-size: 2rem;
  text-align: center;
  margin-top: 20px;
}

/* MOBILE */
@media (max-width: 768px) {
  h1 {
    font-size: 1.5rem;
    text-align: center;
  }
}

</style> -->

<template>
  <section class="mobile-layout">


    <main ref="mapContainer" class="map"></main>

    <!-- Buscador de zona: visible siempre que no esté el panel de formulario abierto -->
<div class="buscador-zona" v-show="!panelAbierto || modoMapa">
  <div class="buscador-zona-fila">
    <div class="buscador-zona-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" class="buscador-zona-icono">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        v-model="queryZona"
        type="text"
        placeholder="Buscar colonia, dirección..."
        @keyup.enter="buscarZona"
        @input="onInputZona"
      />
      <button v-if="queryZona" class="buscador-zona-clear" @click="limpiarBusquedaZona">✕</button>
    </div>
    <button class="btn-ubicacion-actual" @click="irAUbicacionActual">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
        <circle cx="12" cy="12" r="8" stroke-dasharray="2 2"/>
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
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
        <circle cx="12" cy="12" r="8" stroke-dasharray="2 2"/>
      </svg>
    </button>

    <figure v-if="!panelAbierto || modoMapa" class="pin-fijo">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26S32 26 32 16C32 7.163 24.837 0 16 0z"
          fill="#1a6b2f" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
      <div class="pin-sombra"></div>
    </figure>

    <button v-show="!panelAbierto" class="btn-buscar" @click="abrirBusqueda">🔍</button>
    <button v-show="!panelAbierto" class="btn-agregar" @click="abrirPanel">+</button>

    <!-- Panel búsqueda de folio — estilo modal igual al admin -->
    <div v-if="panelBusqueda" class="detalle-overlay" @click="panelBusqueda = false"></div>
    <aside v-if="panelBusqueda" class="detalle-folio" @click.stop>
      <button class="cerrar-detalle" @click="panelBusqueda = false">✕</button>
      <h3>Buscar Reporte</h3>

      <div class="folio-busqueda-input">
        <input v-model="folioBusqueda" type="number" placeholder="Ingresa el número de folio..." @keyup.enter="buscarReporte" />
        <button class="btn-buscar-folio" @click="buscarReporte">Buscar</button>
      </div>

      <div v-if="buscando" class="folio-cargando">Buscando...</div>

      <template v-if="reporteEncontrado">
        <div class="detalle-content">
          <p><strong>Folio:</strong> #{{ reporteEncontrado.folio }}</p>
          <p><strong>Departamento:</strong> {{ reporteEncontrado.gestionnombre }}</p>
          <p>
            <strong>Estado:</strong>
            <span class="badge-estado" :style="{ background: colorEstado(reporteEncontrado.estid) }">
              {{ reporteEncontrado.estadonombre }}
            </span>
          </p>
          <p><strong>Descripción:</strong> {{ reporteEncontrado.descripcion }}</p>
          <p><strong>Fecha:</strong> {{ formatFecha(reporteEncontrado.fecha) }}</p>
          <p v-if="reporteEncontrado.domiciliobache"><strong>Domicilio:</strong> {{ reporteEncontrado.domiciliobache }}</p>
          <p v-if="reporteEncontrado.referencias"><strong>Referencias:</strong> {{ reporteEncontrado.referencias }}</p>

          <p v-else><strong>Jefe asignado:</strong> <span style="color:#e67e22">Sin asignar</span></p>
          <div v-if="reporteEncontrado.foto" class="foto-container">
            <img :src="reporteEncontrado.foto" alt="Foto del reporte" />
          </div>
        </div>
      </template>

      <div v-else-if="buscado && !buscando" class="folio-no-encontrado">
        <svg viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" width="32" height="32">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <p>No se encontró ningún reporte con ese folio.</p>
      </div>
    </aside>

    <!-- Panel formulario / modo mapa -->
    <section
      v-if="panelAbierto"
      class="panel"
      :class="modoMapa ? 'panel--mapa' : 'panel--expandido'"
    >
      <div v-if="modoMapa" class="franja-mapa">
        <button class="btn-cerrar-mapa" @click="cancelarModoMapa">✕</button>
        <span class="handle-bar" @click="togglePanelAlto"></span>
        <h3 class="franja-titulo">Fija la dirección</h3>
        <p class="franja-sub">Mueve el mapa para seleccionar la ubicación</p>
        <button class="btn-confirmar-dir" @click="confirmarDireccion">
          Confirmar dirección
        </button>
      </div>

      <template v-else>
        <header class="panel-header" @click.self="togglePanelAlto">
          <div class="handle-bar" @click="togglePanelAlto"></div>
          <button class="btn-cerrar-panel" @click="abrirPanel">✕</button>
          <h2>Nuevo Reporte</h2>
        </header>

        <form class="panel-form" @submit.prevent="enviarReporte" @mousedown.stop @touchstart.stop>
          <!-- <label>Departamento</label>
          <select v-model="form.departamento" :class="{ 'input-error': errores.departamento }">
            <option value="">Selecciona...</option>
            <option value="Panteones">Panteones</option>
            <option value="Alumbrado Público y Eficienicia Energética">Alumbrado Público y Eficienicia Energética</option>
            <option value="Limpieza, Recolecccion, Tratamiento y Disposicion Final de Residuos">Limpieza, Recolecccion, Tratamiento y Disposicion Final de Residuos</option>
            <option value="Parques y Jardines">Parques y Jardines</option>
            <option value="Mercados y Comercio de la Via Publica">Mercados y Comercio de la Via Publica</option>
            <option value="Conservacion y Mantenimiento de infraestructura">Conservacion y Mantenimiento de infraestructura</option>
            <option value="Sistemas de Drenaje Pluvial">Sistemas de Drenaje Pluvial</option>
          </select>
          <span v-if="errores.departamento" class="msg-error">{{ errores.departamento }}</span>

          <label>Problema</label>
          <select v-model="form.problema" :disabled="!form.departamento" :class="{ 'input-error': errores.problema }">
            <option value="">Selecciona...</option>
            <option value="Bache">Bache</option>
            <option value="Luminaria fundida">Luminaria fundida</option>
            <option value="Árbol caído">Árbol caído</option>
            <option value="Otro">Otro</option>
          </select>
          <span v-if="errores.problema" class="msg-error">{{ errores.problema }}</span> -->
          <label>Departamento</label>
            <select
              v-model="form.departamento_id"
              @change="onDepartamentoSeleccionado"
              :class="{ 'input-error': errores.departamento_id }"
            >
              <option value="">Selecciona un departamento...</option>
              <option v-for="dep in departamentos" :key="dep.id" :value="dep.id">
                {{ dep.nombre }}
              </option>
            </select>
            <span v-if="errores.departamento_id" class="msg-error">{{ errores.departamento_id }}</span>

            <label>Problema</label>
            <select
              v-model="form.problema_id"
              :class="{ 'input-error': errores.problema_id }"
              :disabled="!form.departamento_id"
            >
              <option value="">
                {{ form.departamento_id ? 'Selecciona el problema...' : 'Primero selecciona un departamento' }}
              </option>
              <option v-for="prob in problemas" :key="prob.id" :value="prob.id">
                {{ prob.nombre }}
              </option>
            </select>
            <span v-if="errores.problema_id" class="msg-error">{{ errores.problema_id }}</span>
          <label>Descripción</label>
          <textarea v-model="form.descripcion" rows="4" placeholder="Describe el problema..." maxlength="600" :class="{ 'input-error': errores.descripcion }"></textarea>
          <span v-if="errores.descripcion" class="msg-error">{{ errores.descripcion }}</span>
          <span class="contador" :class="{ limite: form.descripcion.length >= 600 }">
            {{ form.descripcion.length }}/600
          </span>

          <label>Nombre <span class="opcional">(Opcional)</span></label>
          <input v-model="form.nombre" type="text" placeholder="Si se deja vacío, será Anónimo" />

          <label>Teléfono</label>
          <input v-model="form.telefono" type="tel" maxlength="10" minlength="10" placeholder="10 dígitos" :class="{ 'input-error': errores.telefono }" />
          <span v-if="errores.telefono" class="msg-error">{{ errores.telefono }}</span>

          <label>Domicilio del incidente</label>
          <div class="input-mapa-wrapper" :class="{ 'input-error': errores.domicilio }">
            <input v-model="form.domicilio" type="text" placeholder="Calle y número" class="input-domicilio" />
            <button type="button" class="btn-abrir-mapa" @click="abrirModoMapa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7l6-3 5.447 2.724A1 1 0 0 1 21 7.618v10.764a1 1 0 0 1-1.447.894L15 17l-6 3z"/>
                <path d="M9 7v13M15 4v13"/>
              </svg>
            </button>
          </div>
          <span v-if="errores.domicilio" class="msg-error">{{ errores.domicilio }}</span>

          <label>Referencias <span class="opcional">(Opcional)</span></label>
          <input v-model="form.referencias" type="text" placeholder="Entre calles, cerca de..." />

          <label>Foto</label>
          <div class="foto-wrapper">
            <label class="btn-foto" for="inputFotoFile" :class="{ 'input-error': errores.foto }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              {{ form.foto ? form.foto.name : 'Seleccionar foto' }}
            </label>
            <input id="inputFotoFile" ref="inputFoto" type="file" accept="image/*"
              class="input-foto-hidden" @change="seleccionarFoto" />
          </div>
          <span v-if="errores.foto" class="msg-error">{{ errores.foto }}</span>

          <button type="submit" class="btn-enviar" :disabled="enviando">
          {{ enviando ? 'Enviando...' : 'Enviar Reporte' }}
          </button>
        </form>
      </template>
    </section>

  </section>
</template>

<script setup lang="ts">
  import { onMounted, onUnmounted, ref } from 'vue';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  // Importamos la instancia de supabase que encontraste
  import { supabase } from '../lib/supabase';

  const mapContainer = ref<HTMLElement | null>(null);
  const map          = ref<L.Map | null>(null);
  const inputFoto    = ref<HTMLInputElement | null>(null);
  const modoMapa     = ref(false);
  const volandoAUbicacion = ref(false);

  const panelAbierto = ref(false);
  const panelBusqueda     = ref(false);
  const folioBusqueda     = ref('');
  const reporteEncontrado = ref<any>(null);
  const buscado           = ref(false);
  const buscando          = ref(false);

  const enviando = ref(false);
  const errores = ref<Record<string, string>>({});

  // --- CATÁLOGOS SUPABASE ---
  const departamentos = ref<any[]>([]);
  const problemas = ref<any[]>([]);

  const CULIACAN_BOUNDS = {
    minLat: 24.5800, maxLat: 25.0200,
    minLng: -107.6000, maxLng: -107.1000,
  };

  const dentroDeculiacan = (lat: number, lng: number): boolean => {
    return (
      lat >= CULIACAN_BOUNDS.minLat && lat <= CULIACAN_BOUNDS.maxLat &&
      lng >= CULIACAN_BOUNDS.minLng && lng <= CULIACAN_BOUNDS.maxLng
    );
  };

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
  });

  // 1. Cargar departamentos al iniciar
  const cargarDepartamentos = async () => {
    const { data, error } = await supabase.from('departamentos').select('*').order('id');
    if (!error && data) {
      departamentos.value = data;
    } else {
      console.error('Error al cargar departamentos:', error);
    }
  };

  // 2. Cargar problemas al seleccionar un departamento
  const onDepartamentoSeleccionado = async () => {
    form.value.problema_id = '';
    problemas.value = [];
    errores.value.departamento_id = ''; // Limpiar error visual si elige algo

    if (!form.value.departamento_id) return;

    const { data, error } = await supabase
      .from('problemas')
      .select('*')
      .eq('departamento_id', form.value.departamento_id)
      .order('id');

    if (!error && data) {
      problemas.value = data;
    }
  };

  // Configuración del Mapa (Leaflet)
  const onResize = () => setTimeout(() => map.value?.invalidateSize(), 100);

  onMounted(() => {
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height   = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.height   = '100%';
    document.body.style.margin   = '0';
    document.body.style.padding  = '0';

    window.addEventListener('resize', onResize);

    // Cargar catálogos de base de datos
    cargarDepartamentos();

    if (!mapContainer.value) return;
    map.value = L.map(mapContainer.value, { zoomControl: false }).setView([24.8091, -107.3940], 15);

    map.value.on('moveend', () => {
      if (!volandoAUbicacion.value) queryZona.value = '';
      volandoAUbicacion.value = false;
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map.value);

    setTimeout(() => map.value?.invalidateSize(), 100);
  });

  onUnmounted(() => {
    document.documentElement.style.overflow = '';
    document.documentElement.style.height   = '';
    document.body.style.overflow = '';
    document.body.style.height   = '';
    window.removeEventListener('resize', onResize);
  });

  const obtenerDireccionCentro = async () => {
    if (!map.value) return;
    const centro = map.value.getCenter();
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${centro.lat}&lon=${centro.lng}`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await res.json();
      if (data?.display_name) form.value.domicilio = data.display_name;
      form.value.latitud  = centro.lat;
      form.value.longitud = centro.lng;
    } catch (e) { console.error(e); }
  };

  const abrirModoMapa = () => {
    modoMapa.value = true;
    setTimeout(() => map.value?.invalidateSize(), 400);
  };

  const cancelarModoMapa = () => {
    modoMapa.value = false;
    setTimeout(() => map.value?.invalidateSize(), 400);
  };

  const confirmarDireccion = async () => {
    if (!map.value) return;
    const centro = map.value.getCenter();
    if (!dentroDeculiacan(centro.lat, centro.lng)) {
      alert('La ubicación seleccionada está fuera de Culiacán. Por favor selecciona un punto dentro del municipio.');
      return;
    }
    await obtenerDireccionCentro();
    modoMapa.value = false;
    setTimeout(() => map.value?.invalidateSize(), 400);
  };

  const irAUbicacionActual = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        volandoAUbicacion.value = true;
        map.value?.flyTo([latitude, longitude], 16, { duration: 1 });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { Accept: 'application/json' } }
          );
          const data = await res.json();
          if (data?.address) {
            const a = data.address;
            const direccion = [
              a.road,
              a.house_number,
              a.neighbourhood || a.suburb || a.quarter,
              a.city || a.town
            ].filter(Boolean).join(', ');
            queryZona.value = direccion;
          }
        } catch { }
      },
      () => {
        alert('No se pudo obtener tu ubicación');
      },
      {
        enableHighAccuracy: true,  // <-- esto
        timeout: 10000,
        maximumAge: 0
      }
    );
  };
  const zoomIn  = () => map.value?.zoomIn();
  const zoomOut = () => map.value?.zoomOut();

  const abrirPanel = () => {
    panelAbierto.value = !panelAbierto.value;
    if (panelAbierto.value) {
      if (queryZona.value) form.value.domicilio = queryZona.value;
      modoMapa.value = false;
      setTimeout(() => map.value?.invalidateSize(), 400);
    }
  };

  const seleccionarFoto = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) {
      form.value.foto = input.files[0];
      errores.value.foto = ''; // Quitar alerta si selecciona
    }
  };

  const limpiarFormulario = () => {
    form.value = {
      departamento_id: '', problema_id: '', descripcion: '', nombre: '',
      telefono: '', domicilio: '', referencias: '',
      foto: null, latitud: 0, longitud: 0,
    };
    problemas.value = [];
    errores.value = {};
    if (inputFoto.value) inputFoto.value.value = '';
  };

  const enviarReporte = async () => {
    if (enviando.value) return;

    errores.value = {};
    let esValido = true;

    // --- Validaciones Obligatorias ---
    if (!form.value.departamento_id) { errores.value.departamento_id = 'Selecciona el departamento'; esValido = false; }
    if (!form.value.problema_id) { errores.value.problema_id = 'Selecciona el problema'; esValido = false; }
    if (!form.value.descripcion.trim()) { errores.value.descripcion = 'La descripción es obligatoria'; esValido = false; }

    if (!form.value.telefono) {
      errores.value.telefono = 'El teléfono es obligatorio'; esValido = false;
    } else if (!/^\d{10}$/.test(form.value.telefono)) {
      errores.value.telefono = 'Ingresa un número válido de 10 dígitos'; esValido = false;
    }

    if (!form.value.latitud || !form.value.longitud || !form.value.domicilio.trim()) {
      errores.value.domicilio = 'Por favor selecciona una ubicación en el mapa'; esValido = false;
    } else if (!dentroDeculiacan(form.value.latitud, form.value.longitud)) {
      errores.value.domicilio = 'La ubicación está fuera de Culiacán'; esValido = false;
    }

    if (!form.value.foto) { errores.value.foto = 'Debes adjuntar una foto de evidencia'; esValido = false; }

    if (!esValido) return;

    enviando.value = true;

    try {
      let fotoUrlFinal = '';

      // 1. Subir la foto a Supabase Storage
      if (form.value.foto) {
        const file = form.value.foto;
        const fileExt = file.name.split('.').pop();
        // Generamos un nombre único para evitar que fotos con el mismo nombre se sobreescriban
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `evidencias/${fileName}`; // Se guardará dentro de una carpeta "evidencias"

        const { error: uploadError } = await supabase.storage
          .from('fotos')
          .upload(filePath, file);

        if (uploadError) throw new Error('No se pudo subir la imagen: ' + uploadError.message);

        // Obtener la URL pública de la foto recién subida
        const { data: publicUrlData } = supabase.storage
          .from('fotos')
          .getPublicUrl(filePath);

        fotoUrlFinal = publicUrlData.publicUrl;
      }

      // 2. Insertar los datos en la tabla 'reportes'
      const { error: insertError } = await supabase
        .from('reportes')
        .insert({
          departamento_id: form.value.departamento_id,
          problema_id: form.value.problema_id,
          descripcion: form.value.descripcion.trim(),
          nombre: form.value.nombre ? form.value.nombre.trim() : 'Anónimo',
          telefono: form.value.telefono,
          domicilio: form.value.domicilio.trim(),
          referencias: form.value.referencias ? form.value.referencias.trim() : null,
          foto_url: fotoUrlFinal
        });

      if (insertError) throw new Error('Error al guardar en base de datos: ' + insertError.message);

      alert('¡Reporte enviado exitosamente!');
      limpiarFormulario();
      panelAbierto.value = false;

    } catch (error: any) {
      console.error("Error detallado:", error);
      alert(error.message || 'Error de conexión al enviar el reporte');
    } finally {
      enviando.value = false;
    }
  };

  const abrirBusqueda = () => {
    panelBusqueda.value     = true;
    reporteEncontrado.value = null;
    buscado.value           = false;
    buscando.value          = false;
    folioBusqueda.value     = '';
  };

  const buscarReporte = async () => {
    if (!folioBusqueda.value) return;
    buscando.value          = true;
    reporteEncontrado.value = null;
    buscado.value           = false;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/reportes/${folioBusqueda.value}`);
      if (!res.ok) { buscado.value = true; return; }
      reporteEncontrado.value = await res.json();
      buscado.value = true;
    } catch {
      buscado.value = true;
    } finally {
      buscando.value = false;
    }
  };

  // ── Buscador de zona ──────────────────────────────────
  const queryZona       = ref('');
  const sugerenciasZona = ref<any[]>([]);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const onInputZona = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!queryZona.value.trim()) { sugerenciasZona.value = []; return; }
    debounceTimer = setTimeout(buscarZona, 400);
  };

  const buscarZona = async () => {
    if (!queryZona.value.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryZona.value)}&limit=6&countrycodes=mx`,
        { headers: { Accept: 'application/json' } }
      );
      sugerenciasZona.value = await res.json();
    } catch { sugerenciasZona.value = []; }
  };

  const irASugerencia = (s: any) => {
    sugerenciasZona.value = [];
    queryZona.value       = s.display_name;
    map.value?.flyTo([parseFloat(s.lat), parseFloat(s.lon)], 16, { duration: 1 });

  };

  const limpiarBusquedaZona = () => {
    queryZona.value       = '';
    sugerenciasZona.value = [];
  };

  const formatFecha = (f: string) => f ? new Date(f).toLocaleDateString('es-MX') : '';
</script>
