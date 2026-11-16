<template>
  <section class="rdp" aria-label="Detalle del reporte">
    <header class="rdp-head">
      <div class="rdp-head-info">
        <h3>Detalle del Reporte</h3>
        <p v-if="reporte" class="folio-text clickable-text" title="Copiar folio" @click="copiarFolio">
          Folio: #{{ reporte.folio }}
        </p>
        <p v-else class="folio-text">Sin reporte seleccionado</p>
        <span class="copied-msg" v-if="copiado">¡Folio copiado!</span>
      </div>
      <span v-if="reporte" :class="['badge', obtenerClaseEstado(reporte.estado.toLowerCase())]">
        {{ reporte.estado }}
      </span>
    </header>

    <!-- Estado vacío -->
    <div v-if="!reporte" class="rdp-vacio">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="46" height="46">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="9" y1="13" x2="15" y2="13"></line>
        <line x1="9" y1="17" x2="15" y2="17"></line>
      </svg>
      <p>Selecciona un reporte de la tabla para ver su detalle.</p>
    </div>

    <div v-else class="rdp-body">
      <!-- Evidencia -->
      <div class="rdp-foto">
        <a v-if="reporte.foto_url" :href="reporte.foto_url" target="_blank" rel="noopener" title="Abrir imagen completa">
          <img :src="reporte.foto_url" alt="Evidencia" />
        </a>
        <div v-else class="sin-foto">Sin imagen</div>
      </div>

      <div class="info-item" v-if="reporte.mensajeAI">
        <label>Validación de la IA</label>
        <div class="descripcion-box" :style="{
          color: reporte.fotoTipoID === 0 ? '#1a6b2f' : '#c62828',
          backgroundColor: reporte.fotoTipoID === 0 ? '#e8f5e9' : '#ffebee',
          borderColor: reporte.fotoTipoID === 0 ? '#81c784' : '#ef9a9a'
        }">
          {{ reporte.mensajeAI }}
        </div>
      </div>

      <div class="info-item">
        <label>Problema Reportado</label>
        <p class="destacado">
          {{
            reporte.problemas?.nombre || reporte.problemas_externos?.nombre ||
            reporte.problemas?.nombreamigable || reporte.problemas_externos?.nombreamigable ||
            'No proporcionado'
          }}
        </p>
      </div>

      <div class="info-item">
        <label>Descripción</label>
        <div class="descripcion-box">{{ reporte.descripcion }}</div>
      </div>

      <div class="info-item">
        <label>Ubicación</label>
        <div class="rdp-ubicacion">
          <div>
            <p>{{ reporte.domicilio }}</p>
            <p v-if="reporte.referencias" class="referencias">Ref: {{ reporte.referencias }}</p>
          </div>
          <button type="button" class="btn-mapa" aria-label="Abrir en Google Maps" title="Abrir en Google Maps"
            @click="abrirGoogleMaps(reporte.domicilio)">
            <MapMarker class="btn-mapa" />
          </button>
        </div>
      </div>

      <div class="rdp-grid2">
        <div class="info-item">
          <label>Prioridad</label>
          <p>{{ prioridadTexto }}</p>
        </div>
        <div class="info-item">
          <label>Ciudadano</label>
          <p>{{ reporte.nombre }}</p>
        </div>
        <div class="info-item">
          <label>Teléfono</label>
          <p>{{ reporte.telefono }}</p>
        </div>
        <div class="info-item">
          <label>Correo Electrónico</label>
          <p class="rdp-corto">{{ reporte.correo || 'No proporcionado' }}</p>
        </div>
        <div class="info-item">
          <label>Supervisor Asignado</label>
          <p>{{ reporte.supervisor || 'No proporcionado' }}</p>
        </div>
        <div class="info-item">
          <label>Jefe Asignado</label>
          <p>{{ reporte.jefe || 'No proporcionado' }}</p>
        </div>
        <div class="info-item">
          <label>Fecha de creación</label>
          <p>{{ formatearFechaLocal(reporte.created_at) }}</p>
        </div>
        <div class="info-item">
          <label>Fecha de Inicio</label>
          <p>{{ formatearFechaOpcional(reporte.fecha_inicio, 'Aún no ha iniciado') }}</p>
        </div>
        <div class="info-item">
          <label>Fecha de Cierre</label>
          <p>{{ formatearFechaOpcional(reporte.fecha_cierre, 'Aún no ha finalizado') }}</p>
        </div>
      </div>

      <!-- Notas e historial -->
      <div class="info-item" v-if="reporte.estado === 'Rechazado' && reporte.notas_rechazo?.length">
        <label>Notas de Rechazo</label>
        <div class="notas-lista">
          <article v-for="(n, i) in reporte.notas_rechazo" :key="i" class="nota-card nota-rechazo">
            <header class="nota-meta">
              <span class="nota-titulo">{{ n.titulo }}</span>
              <time class="nota-fecha">{{ n.fecha }} · {{ n.hora }}</time>
            </header>
            <p class="nota-texto">{{ n.notas }}</p>
          </article>
        </div>
      </div>

      <div class="info-item" v-if="reporte.estado === 'Devuelto' && reporte.notas_devuelto?.length">
        <label>Notas de Devolución</label>
        <div class="notas-lista">
          <article v-for="(n, i) in reporte.notas_devuelto" :key="i" class="nota-card nota-devuelto">
            <header class="nota-meta">
              <span class="nota-titulo">{{ n.titulo }}</span>
              <time class="nota-fecha">{{ n.fecha }} · {{ n.hora }}</time>
            </header>
            <p class="nota-texto">{{ n.notas }}</p>
          </article>
        </div>
      </div>

      <div class="info-item" v-if="reporte.estado === 'Turnado' && reporte.notas_turnado?.length">
        <label>Notas de Turnado</label>
        <div class="notas-lista">
          <article v-for="(n, i) in reporte.notas_turnado" :key="i" class="nota-card nota-turnado">
            <header class="nota-meta">
              <span class="nota-titulo">{{ n.titulo }}</span>
              <time class="nota-fecha">{{ n.fecha }} · {{ n.hora }}</time>
            </header>
            <p class="nota-texto">{{ n.notas }}</p>
          </article>
        </div>
      </div>

      <div class="info-item" v-if="reporte.notas_finales_finalizacion?.length">
        <label>Registro Final de finalización</label>
        <div class="notas-lista">
          <article v-for="(n, i) in reporte.notas_finales_finalizacion" :key="i" class="nota-card nota-finalizacion">
            <header class="nota-meta">
              <span class="nota-titulo">{{ n.titulo }}</span>
              <time class="nota-fecha">{{ n.fecha }} · {{ n.hora }}</time>
            </header>
            <p class="nota-texto">{{ n.notas }}</p>
            <a v-if="n.foto_url" :href="n.foto_url" target="_blank" rel="noopener">
              <img :src="n.foto_url" alt="Registro de finalización" class="nota-foto" />
            </a>
          </article>
        </div>
      </div>

      <div class="info-item" v-if="reporte.notas_avances?.length">
        <label>Avances registrados</label>
        <div class="notas-lista">
          <article v-for="(n, i) in reporte.notas_avances" :key="i" class="nota-card nota-avance">
            <header class="nota-meta">
              <span class="nota-titulo">{{ n.titulo }}</span>
              <time class="nota-fecha">{{ n.fecha }} · {{ n.hora }}</time>
            </header>
            <p class="nota-texto">{{ n.notas }}</p>
            <a v-if="n.foto_url" :href="n.foto_url" target="_blank" rel="noopener">
              <img :src="n.foto_url" alt="Evidencia del avance" class="nota-foto" />
            </a>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatearFechaLocal, obtenerClaseEstado } from '../logic/reporteDetalleModal'
import { abrirGoogleMaps } from '../logic/googleMaps'
import MapMarker from '@primeicons/vue/map-marker'

const props = defineProps({
  reporte: { type: Object, default: null },
})

const prioridades: Record<number, string> = {
  1: 'Muy Alta',
  2: 'Alta',
  3: 'Media',
  4: 'Baja',
  5: 'Muy Baja',
}
const prioridadTexto = computed(() => prioridades[props.reporte?.prioridad] || 'No proporcionada')

const formatearFechaOpcional = (valor: string | null | undefined, vacio: string) =>
  valor ? formatearFechaLocal(valor) : vacio

const copiado = ref(false)
const copiarFolio = async () => {
  try {
    await navigator.clipboard.writeText(props.reporte.folio)
    copiado.value = true
    setTimeout(() => (copiado.value = false), 2000)
  } catch (err) {
    console.error('Error al copiar el folio:', err)
  }
}
</script>

<!-- Reutiliza los estilos de notas, badges y cajas del modal -->
<style src="../assets/reporteDetalle.css" />

<style scoped>
.rdp {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: #fff;
  border: 1px solid #e3e0d4;
  border-top: 4px solid #621132;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.rdp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px 12px;
  border-bottom: 1px solid #eee;
  background: #faf8f0;
}
.rdp-head h3 {
  margin: 0;
  font-size: 1.05rem;
  color: #621132;
}
.rdp-head .folio-text {
  margin: 2px 0 0;
  font-size: 0.82rem;
  color: #5d4037;
  word-break: break-all;
}

.rdp-body > * {
  flex-shrink: 0;
}

.rdp-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rdp-vacio {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 30px;
  text-align: center;
  color: #9a9a9a;
}
.rdp-vacio p {
  margin: 0;
  max-width: 240px;
  font-size: 0.92rem;
}

.rdp-foto {
  border-radius: 10px;
  overflow: hidden;
  background: #f1f1f1;
  border: 1px solid #e3e0d4;
}
.rdp-foto a {
  display: block;
}
.rdp-foto img {
  display: block;
  width: 100%;
  height: 230px;
  object-fit: cover;
}
.rdp-foto .sin-foto {
  padding: 40px 0;
  text-align: center;
  color: #999;
}

.rdp-ubicacion {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.rdp-grid2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}
.rdp-corto {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .rdp {
    min-height: 480px;
  }
}
</style>