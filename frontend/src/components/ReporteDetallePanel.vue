<template>
  <section class="rdp" aria-label="Detalle del reporte">
    <header class="rdp-head">
      <div class="rdp-head-info">
        <h3>Detalle del Reporte</h3>

        <div v-if="reporte" class="folio-linea">
          <p class="folio-text clickable-text" title="Copiar folio" @click="copiarFolio">
            Folio: <span class="folio-valor">#{{ reporte.folio }}</span>
          </p>

          <button type="button" class="btn-copiar-mini" :class="{ 'is-copiado': copiado }" @click="copiarFolio"
            :title="copiado ? '¡Folio copiado!' : 'Copiar folio al portapapeles'">
            <component :is="copiado ? Check : Copy" class="icono-mini" />
            <span>{{ copiado ? 'Copiado' : 'Copiar' }}</span>
          </button>
        </div>
        <p v-else class="folio-text folio-vacio">Sin reporte seleccionado</p>
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
        <a v-if="reporte.foto_url" :href="reporte.foto_url" target="_blank" rel="noopener"
          title="Abrir imagen completa">
          <img :src="reporte.foto_url" alt="Evidencia" />
        </a>
        <div v-else class="sin-foto">Sin imagen</div>
      </div>

      <div class="info-item ia-card" v-if="reporte.mensajeAI"
        :class="reporte.fotoTipoID === 0 ? 'ia-card--ok' : 'ia-card--alerta'">
        <div class="ia-header">
          <label>Validación de la IA</label>
          <span class="ia-tag">
            <component :is="reporte.fotoTipoID === 0 ? Check : AlertTriangle" class="ia-icono" />
            {{ reporte.fotoTipoID === 0 ? 'Coincidencia validada' : 'Revisar observación' }}
          </span>
        </div>

        <div class="ia-mensaje-box">
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
import Copy from '@primeicons/vue/copy'
import Check from '@primeicons/vue/check'

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

.rdp-body>* {
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

.rdp-head-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rdp-head-info h3 {
  margin: 0;
  line-height: 1.2;
}

.folio-linea {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.folio-text {
  margin: 0;
  font-size: 0.92rem;
  color: #4b5563;
  white-space: nowrap;
}

.folio-valor {
  font-weight: 700;
  color: #1f2937;
}

.folio-vacio {
  color: #6b7280;
  font-style: italic;
}

.btn-copiar-mini {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background-color: #ffffff;
  color: #374151;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.btn-copiar-mini:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.btn-copiar-mini.is-copiado {
  background-color: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

.icono-mini {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
}

.ia-card {
  margin-top: 0.5rem;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  border-left-width: 5px;
}

.ia-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.ia-header label {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.ia-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
}

.ia-icono {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.ia-mensaje-box {
  font-size: 0.94rem;
  font-weight: 500;
  line-height: 1.5;
}

/* Validado (fotoTipoID === 0) */
.ia-card--ok {
  background-color: #eef8f0;
  border-color: #b7e1c0;
  border-left-color: #1f7a38;
}

.ia-card--ok label,
.ia-card--ok .ia-mensaje-box {
  color: #155724;
}

.ia-card--ok .ia-tag {
  background-color: #d4edda;
  color: #155724;
}

/* Alerta / discrepancia */
.ia-card--alerta {
  background-color: #fff2f2;
  border-color: #f5c2c7;
  border-left-color: #c62828;
}

.ia-card--alerta label,
.ia-card--alerta .ia-mensaje-box {
  color: #842029;
}

.ia-card--alerta .ia-tag {
  background-color: #f8d7da;
  color: #842029;
}

@media (max-width: 1100px) {
  .rdp {
    min-height: 480px;
  }
}
</style>