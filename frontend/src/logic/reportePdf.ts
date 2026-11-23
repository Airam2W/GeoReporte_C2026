import { agregarHistorial } from '@/services/supabaseController'
import { jsPDF } from 'jspdf'

const TINTO: [number, number, number] = [98, 17, 50]
const DORADO: [number, number, number] = [213, 201, 138]
const GRIS_TEXTO: [number, number, number] = [51, 51, 51]
const GRIS_LABEL: [number, number, number] = [119, 119, 119]
const GRIS_LINEA: [number, number, number] = [224, 224, 224]

const MARGEN = 18
const ANCHO = 210
const ALTO = 297
const ANCHO_UTIL = ANCHO - MARGEN * 2
const LIMITE_PAGINA = ALTO - 22 // deja margen para el pie de página

// Categorías de la tabla "categoria_historial"
const NOMBRE_CATEGORIA: Record<number, string> = {
  1: 'Devolución de reporte',
  2: 'Rechazo de reporte',
  3: 'Petición de finalización',
  4: 'Avance del reporte',
  5: 'Aceptación de finalización',
  6: 'Denegación de finalización',
  7: 'Turnado de reporte',
}

// Color de la barra lateral de cada movimiento (mismos tonos que las etiquetas de estado)
const COLOR_CATEGORIA: Record<number, [number, number, number]> = {
  1: [239, 108, 0],
  2: [198, 40, 40],
  3: [0, 121, 107],
  4: [25, 118, 210],
  5: [46, 125, 50],
  6: [87, 24, 152],
  7: [93, 64, 55],
}

interface OpcionesPdf {
  departamento?: string
  supervisor?: string
  devolverBlob?: boolean // true = no descarga, regresa el archivo
}

interface Movimiento {
  categoria: number
  titulo: string
  notas: string
  foto: string
  fecha: string
  ts: number | null
}

// "timestamp without time zone" (created_at) llega sin zona y es UTC → se le agrega "Z".
// "timestamptz" (historial_reporte.fecha) ya trae zona (Z, +00:00, -07:00...) → se respeta.
const TIENE_ZONA = /[T ]\d{2}:\d{2}.*(Z|[+-]\d{2}(:?\d{2})?)$/
const aFechaUtc = (valor: string) => {
  const v = valor.trim().replace(' ', 'T')
  return new Date(TIENE_ZONA.test(v) ? v : `${v}Z`)
}

const formatearFecha = (valor?: string) => {
  if (!valor) return 'No disponible'
  const fecha = aFechaUtc(valor)
  if (isNaN(fecha.getTime())) return 'No disponible'
  return fecha.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nombreUsuario = (u: any) =>
  u ? [u.nombre, u.apellido_p, u.apellido_m].filter(Boolean).join(' ').trim() : ''

// Obtiene los movimientos del historial del reporte, del más antiguo al más reciente.
// Usa el historial crudo (historial_reporte) y, si el panel no lo trae, arma el
// historial con las notas ya separadas por categoría.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const obtenerMovimientos = (reporte: any): Movimiento[] => {
  const crudo = Array.isArray(reporte.historial_reporte)
    ? reporte.historial_reporte
    : reporte.historial_reporte
      ? [reporte.historial_reporte]
      : null

  if (crudo) {
    return (
      crudo
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((h: any): Movimiento => {
          const f = h.fecha ? aFechaUtc(h.fecha) : null
          const ts = f && !isNaN(f.getTime()) ? f.getTime() : null
          return {
            categoria: Number(h.categoria_historial_id),
            titulo: h.titulo?.nombre || '',
            notas: h.notas || '',
            foto: h.foto_url || '',
            fecha: ts !== null ? formatearFecha(h.fecha) : 'Fecha no disponible',
            ts,
          }
        })
        .sort((a: Movimiento, b: Movimiento) => (a.ts ?? 0) - (b.ts ?? 0))
    )
  }

  // Respaldo: notas ya formateadas por categoría
  const porCategoria: [string, number][] = [
    ['notas_devuelto', 1],
    ['notas_rechazo', 2],
    ['notas_finalizacion', 3],
    ['notas_avances', 4],
    ['notas_finales_finalizacion', 5],
    ['notas_denegacion', 6],
    ['notas_turnado', 7],
  ]
  const movimientos: Movimiento[] = []
  for (const [clave, categoria] of porCategoria) {
    const notas = Array.isArray(reporte[clave]) ? reporte[clave] : []
    for (const n of notas) {
      movimientos.push({
        categoria,
        titulo: n.titulo || '',
        notas: n.notas || '',
        foto: n.foto_url || '',
        fecha: [n.fecha, n.hora].filter(Boolean).join(' · ') || 'Fecha no disponible',
        ts: null,
      })
    }
  }
  return movimientos
}

// Carga la imagen y la convierte a JPEG (jsPDF no soporta webp)
const cargarImagen = (url: string): Promise<{ data: string; w: number; h: number } | null> =>
  new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        resolve({
          data: canvas.toDataURL('image/jpeg', 0.85),
          w: img.naturalWidth,
          h: img.naturalHeight,
        })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generarPdfReporte = async (reporte: any, opciones: OpcionesPdf = {}) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 0

  const asegurarEspacio = (alto: number) => {
    if (y + alto > LIMITE_PAGINA) {
      doc.addPage()
      y = MARGEN
    }
  }

  // ---------- Encabezado institucional ----------
  doc.setFillColor(...TINTO)
  doc.rect(0, 0, ANCHO, 32, 'F')
  doc.setFillColor(...DORADO)
  doc.rect(0, 32, ANCHO, 1.5, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('GeoReporte', MARGEN, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text('Ayuntamiento de Culiacán · Plataforma ciudadana de reportes', MARGEN, 22)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('FICHA DE REPORTE', ANCHO - MARGEN, 15, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(`Folio: ${reporte.folio}`, ANCHO - MARGEN, 22, { align: 'right' })

  y = 44

  // ---------- Helpers de contenido ----------
  const seccion = (titulo: string) => {
    asegurarEspacio(14)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...TINTO)
    doc.text(titulo.toUpperCase(), MARGEN, y)
    y += 2
    doc.setDrawColor(...TINTO)
    doc.setLineWidth(0.5)
    doc.line(MARGEN, y, ANCHO - MARGEN, y)
    y += 7
  }

  const campo = (etiqueta: string, valor: string, x = MARGEN, ancho = ANCHO_UTIL) => {
    const lineas = doc.splitTextToSize(valor || 'No proporcionado', ancho) as string[]
    asegurarEspacio(6 + lineas.length * 5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...GRIS_LABEL)
    doc.text(etiqueta.toUpperCase(), x, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(...GRIS_TEXTO)
    doc.text(lineas, x, y + 5)
    const alto = 6 + lineas.length * 5
    return alto
  }

  const filaDoble = (
    e1: string, v1: string,
    e2: string, v2: string,
  ) => {
    const mitad = ANCHO_UTIL / 2 - 4
    const a1 = campo(e1, v1, MARGEN, mitad)
    const a2 = campo(e2, v2, MARGEN + ANCHO_UTIL / 2 + 4, mitad)
    y += Math.max(a1, a2) + 4
  }

  const campoSimple = (etiqueta: string, valor: string) => {
    y += campo(etiqueta, valor) + 4
  }

  // Datos que cambian según el rol que descarga (cada panel consulta distinto)
  const esExterno = !reporte.problemas && !!reporte.problemas_externos
  const problemaNombre =
    reporte.problemas?.nombre || reporte.problemas_externos?.nombre || 'No disponible'
  const estadoNombre =
    reporte.estado || reporte.detalle_reporte?.estadoreporte?.estado || 'No disponible'
  const supervisorNombre =
    opciones.supervisor && opciones.supervisor !== 'No disponible'
      ? opciones.supervisor
      : nombreUsuario(reporte.detalle_reporte?.supervisores?.usuarios) || 'No disponible'
  const jefeNombre =
    reporte.jefe && reporte.jefe !== 'SIN ASIGNAR'
      ? reporte.jefe
      : nombreUsuario(reporte.detalle_reporte?.jefes?.usuarios) || 'SIN ASIGNAR'

  // ---------- Datos generales ----------
  seccion('Datos generales')
  filaDoble(
    'Fecha de creación', formatearFecha(reporte.created_at),
    'Estado de atención', estadoNombre,
  )
  filaDoble(
    'Departamento', opciones.departamento || 'No disponible',
    'Problemática', problemaNombre,
  )

  // ---------- Detalle ----------
  seccion('Detalle del reporte')
  campoSimple('Descripción', reporte.descripcion)
  campoSimple('Ubicación', reporte.domicilio)
  campoSimple('Referencias', reporte.referencias)

  // ---------- Atención (los departamentos externos no tienen supervisor ni jefe) ----------
  if (!esExterno) {
    seccion('Atención y seguimiento')
    filaDoble(
      'Supervisor responsable', supervisorNombre,
      'Jefe asignado', jefeNombre,
    )
  }

  // ---------- Evidencia fotográfica ----------
  seccion('Evidencia fotográfica')
  const imagen = reporte.foto_url ? await cargarImagen(reporte.foto_url) : null

  if (imagen) {
    // Espacio disponible en la página actual (deja margen para el pie de página)
    const espacioRestante = ALTO - 22 - y - 6
    const ALTO_MINIMO = 45 // por debajo de esto, mejor pasar a la hoja siguiente

    if (espacioRestante < ALTO_MINIMO) {
      doc.addPage()
      y = MARGEN
    }

    const disponibleH = Math.min(95, ALTO - 22 - y - 6)
    const ratio = Math.min(ANCHO_UTIL / imagen.w, disponibleH / imagen.h)
    const w = imagen.w * ratio
    const h = imagen.h * ratio
    const x = MARGEN + (ANCHO_UTIL - w) / 2

    doc.setDrawColor(...GRIS_LINEA)
    doc.setLineWidth(0.3)
    doc.rect(x - 1, y - 1, w + 2, h + 2)
    doc.addImage(imagen.data, 'JPEG', x, y, w, h)
    y += h + 8
  } else {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...GRIS_LABEL)
    doc.text(
      reporte.foto_url ? 'No fue posible cargar la imagen.' : 'El reporte no incluye imagen.',
      MARGEN,
      y,
    )
    y += 8
  }

  // ---------- Historial del reporte ----------
  const movimientos = obtenerMovimientos(reporte)
  // Las fotos de los movimientos (avances, finalización...) se cargan en paralelo
  const fotosMovimientos = await Promise.all(
    movimientos.map((m) => (m.foto ? cargarImagen(m.foto) : Promise.resolve(null))),
  )

  const dibujarMovimiento = (
    m: Movimiento,
    img: { data: string; w: number; h: number } | null,
  ) => {
    const color = COLOR_CATEGORIA[m.categoria] ?? TINTO
    const xTexto = MARGEN + 5
    const anchoTexto = ANCHO_UTIL - 5

    asegurarEspacio(22) // que el encabezado del movimiento no quede huérfano
    let yBarra = y

    // La barra lateral se dibuja por tramos si el movimiento salta de página
    const cerrarBarra = () => {
      doc.setFillColor(...color)
      doc.rect(MARGEN, yBarra, 1.6, Math.max(y - yBarra, 1), 'F')
    }
    const saltoSiNoCabe = (alto: number) => {
      if (y + alto > LIMITE_PAGINA) {
        cerrarBarra()
        doc.addPage()
        y = MARGEN
        yBarra = y
      }
    }

    // Categoría + título
    const nombreCategoria = NOMBRE_CATEGORIA[m.categoria] ?? 'Movimiento'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    const lineasTitulo = doc.splitTextToSize(
      m.titulo ? `${nombreCategoria} · ${m.titulo}` : nombreCategoria,
      anchoTexto,
    ) as string[]
    doc.setTextColor(...color)
    for (const linea of lineasTitulo) {
      saltoSiNoCabe(5)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...color)
      doc.text(linea, xTexto, y + 3.5)
      y += 5
    }

    // Fecha
    saltoSiNoCabe(5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRIS_LABEL)
    doc.text(m.fecha, xTexto, y + 3)
    y += 5.5

    // Notas
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lineasNotas = doc.splitTextToSize(m.notas || 'Sin notas registradas.', anchoTexto) as string[]
    for (const linea of lineasNotas) {
      saltoSiNoCabe(5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...GRIS_TEXTO)
      doc.text(linea, xTexto, y + 3.5)
      y += 5
    }

    // Foto del movimiento (si tiene)
    if (img) {
      const ratio = Math.min(anchoTexto / img.w, 55 / img.h)
      const w = img.w * ratio
      const h = img.h * ratio
      saltoSiNoCabe(h + 5)
      doc.setDrawColor(...GRIS_LINEA)
      doc.setLineWidth(0.3)
      doc.rect(xTexto - 1, y + 1, w + 2, h + 2)
      doc.addImage(img.data, 'JPEG', xTexto, y + 2, w, h)
      y += h + 5
    } else if (m.foto) {
      saltoSiNoCabe(5)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8.5)
      doc.setTextColor(...GRIS_LABEL)
      doc.text('No fue posible cargar la imagen de este movimiento.', xTexto, y + 3)
      y += 5
    }

    cerrarBarra()
    y += 5 // separación entre movimientos
  }

  seccion(`Historial del reporte${movimientos.length ? ` (${movimientos.length})` : ''}`)

  if (!movimientos.length) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...GRIS_LABEL)
    doc.text('Este reporte aún no tiene movimientos en su historial.', MARGEN, y)
    y += 8
  } else {
    movimientos.forEach((m, i) => dibujarMovimiento(m, fotosMovimientos[i] ?? null))
  }

  // ---------- Pie de página en todas las hojas ----------
  const totalPaginas = doc.getNumberOfPages()
  const generado = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })

  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setDrawColor(...GRIS_LINEA)
    doc.setLineWidth(0.3)
    doc.line(MARGEN, ALTO - 16, ANCHO - MARGEN, ALTO - 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRIS_LABEL)
    doc.text('Ayuntamiento de Culiacán · GeoReporte · Documento de uso interno', MARGEN, ALTO - 11)
    doc.text(`Generado el ${generado}`, MARGEN, ALTO - 7)
    doc.text(`Página ${i} de ${totalPaginas}`, ANCHO - MARGEN, ALTO - 11, { align: 'right' })
  }

  const numero = reporte.folio
  const nombreArchivo = `GeoReporte_${numero}.pdf`

  if (opciones.devolverBlob) {
    return { blob: doc.output('blob') as Blob, nombreArchivo }
  }
  doc.save(nombreArchivo)

  const { error: errorHistorialGeneral } = await agregarHistorial({
    accion: 'Descargar',
    entidad: 'Reporte',
    detalles: `Descargó el PDF del reporte con folio ${numero}`,
  })

  if (errorHistorialGeneral) {
    // No se hace return: la acción principal ya se completó
    console.error('Error al guardar en el historial:', errorHistorialGeneral)
  }
  return null
}