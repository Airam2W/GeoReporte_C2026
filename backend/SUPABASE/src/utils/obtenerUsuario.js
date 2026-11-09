export function obtenerUsuario(req) {
    const token = req.headers.authorization?.split(' ')[1]
    let correoUsuario = 'Sin correo'

    if (token) {
        try {
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
            correoUsuario = decodedToken.correo || 'Sin correo'
        } catch (error) {
            console.error('Error al decodificar el token JWT:', error)
        }
    }

    // Convertir a String para evitar problemas si es null o undefined
    const correoUsuarioString = String(correoUsuario)
    return correoUsuarioString
}