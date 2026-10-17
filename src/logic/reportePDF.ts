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

interface OpcionesPdf {
  departamento?: string
  supervisor?: string
}

const formatearFecha = (valor?: string) => {
  if (!valor) return 'No disponible'
  const utc = valor.endsWith('Z') ? valor : `${valor}Z`
  return new Date(utc).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
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

export const generarPdfReporte = async (reporte: any, opciones: OpcionesPdf = {}) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 0

  const asegurarEspacio = (alto: number) => {
    if (y + alto > ALTO - 22) {
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

  // ---------- Datos generales ----------
  seccion('Datos generales')
  filaDoble(
    'Fecha de creación', formatearFecha(reporte.created_at),
    'Estado de atención', reporte.estado || 'No disponible',
  )
  filaDoble(
    'Departamento', opciones.departamento || 'No disponible',
    'Problemática', reporte.problemas?.nombre || 'No disponible',
  )

  // ---------- Detalle ----------
  seccion('Detalle del reporte')
  campoSimple('Descripción', reporte.descripcion)
  campoSimple('Ubicación', reporte.domicilio)
  campoSimple('Referencias', reporte.referencias)

  // ---------- Atención ----------
  seccion('Atención y seguimiento')
  filaDoble(
    'Supervisor responsable', opciones.supervisor || 'No disponible',
    'Jefe asignado', reporte.jefe || 'SIN ASIGNAR',
  )

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

  const numero = String(reporte.folio).split('-')[4] || reporte.folio
  doc.save(`Reporte_${numero}.pdf`)
}