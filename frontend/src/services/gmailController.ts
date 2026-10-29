export const API_URL = import.meta.env.VITE_GMAIL_SERVICE

export async function enviarCorreoCreacionReporte(correoData: any) {
    const response = await fetch(`${API_URL}/enviar/correo/creacion-reporte`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },

        body: JSON.stringify(correoData),
    })
    return await response.json()
}

export async function enviarCorreoRechazoReporte(correoData: any) {
    const response = await fetch(`${API_URL}/enviar/correo/rechazo-reporte`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },

        body: JSON.stringify(correoData),
    })
    return await response.json()
}

export async function enviarCorreoFinalizacionReporte(correoData: any) {
    const response = await fetch(`${API_URL}/enviar/correo/finalizacion-reporte`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },

        body: JSON.stringify(correoData),
    })
    return await response.json()
}

export async function enviarCorreoTurnadoReporte(correoData: any) {
    const response = await fetch(`${API_URL}/enviar/correo/turnado-reporte`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },

        body: JSON.stringify(correoData),
    })
    return await response.json()
}

export async function enviarCorreoReportePDF(correoData: any) {
    const response = await fetch(`${API_URL}/enviar/correo/reporte-pdf`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },

        body: JSON.stringify(correoData),
    })
    return await response.json()
}