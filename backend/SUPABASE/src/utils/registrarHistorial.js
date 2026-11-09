export async function registrarHistorial(req, { accion, entidad, detalles }) {
    try {
        const { error } = await supabase.from('historial').insert({
            responsable: req.user?.correo || 'Sistema',
            accion,
            entidad,
            detalles: detalles || null
        })
        if (error) console.error('No se pudo registrar el historial:', error.message)
    } catch (e) {
        console.error('No se pudo registrar el historial:', e)
    }
}