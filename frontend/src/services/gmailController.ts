export const API_URL = import.meta.env.VITE_GMAIL_SERVICE

export async function enviarCorreoCreacionReporte(correoData: any) {
    const response = await fetch(`${API_URL}/enviar/correo/creacion-reporte`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({data: correoData}),
    })
}