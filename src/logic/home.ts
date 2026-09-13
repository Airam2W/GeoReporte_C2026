import { supabase } from '../lib/supabase'

export const verEstadoReporte = () => {
  const modal = document.createElement('div')
  modal.classList.add('modal')
  document.body.appendChild(modal)

  modal.innerHTML = `
    <div class="modal-contenido">
      <h2>Ver Estado del Reporte</h2>
      <p>Ingrese el Folio del reporte:</p>
      <input id="folio-input" type="text" placeholder="Folio" />
      <button id="buscar-btn">Buscar</button>
      <div id="resultado-reporte" style="margin-top:20px; text-align:left;"></div>
      <button id="cerrar-btn" style="margin-top:20px; background:#dc3545; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">
        Cerrar
      </button>
    </div>
  `

  const buscarBtn = modal.querySelector('#buscar-btn') as HTMLButtonElement
  const folioInput = modal.querySelector('#folio-input') as HTMLInputElement
  const resultadoDiv = modal.querySelector('#resultado-reporte') as HTMLDivElement
  const cerrarBtn = modal.querySelector('#cerrar-btn') as HTMLButtonElement

  buscarBtn.addEventListener('click', async () => {
    const folio = folioInput.value.trim()
    if (!folio) {
      resultadoDiv.innerHTML = `<p style="color:red;">Por favor ingrese un folio válido.</p>`
      return
    }

    const resultado = await mostrarEstadoReporte(folio)
    if (resultado) {
      resultadoDiv.innerHTML = `
        <h3>Información del reporte</h3>
        <p><strong>Folio:</strong> ${resultado.folio}</p>
        <p><strong>Estado:</strong> ${resultado.estado}</p>
        <p><strong>Departamento actual:</strong> ${resultado.departamentoActual}</p>
        <p><strong>Problema:</strong> ${resultado.problema}</p>
        <p><strong>Domicilio:</strong> ${resultado.domicilio}</p>
      `
    } else {
      resultadoDiv.innerHTML = `<p style="color:red;">No se encontró información para el folio ingresado.</p>`
    }
  })

  cerrarBtn.addEventListener('click', () => {
    document.body.removeChild(modal)
  })
}


export const mostrarEstadoReporte = async (folio: string) => {
  try {
    // 1. Buscar estado y departamentoactual en reportesexistentes con join a departamentos
    const { data: estadoData, error: estadoError } = await supabase
      .from('reportesexistentes')
      .select(`
        estado,
        departamentos:departamentoactual ( nombre )
      `)
      .eq('folio', folio)
      .single()

    if (estadoError) throw estadoError

    // 2. Buscar problema y domicilio en reportes, con joins a departamentos y problemas
    const { data: reporteData, error: reporteError } = await supabase
      .from('reportes')
      .select(`
        domicilio,
        departamentos ( nombre ),
        problemas ( nombre )
      `)
      .eq('folio', folio)
      .single()

    if (reporteError) throw reporteError

    return {
      folio,
      estado: estadoData?.estado,
      departamentoActual: estadoData?.departamentos?.nombre, // nombre del departamento actual
      problema: reporteData?.problemas?.nombre,              // nombre del problema
      domicilio: reporteData?.domicilio
    }
  } catch (error: any) {
    console.error('Error al consultar estado del reporte:', error.message)
    return null
  }
}