import { supabase } from '../config/supabase.js'

export async function registrarHistorial(origen, { accion, entidad, detalles }) {
    try {
        let responsable = 'Sistema';

        // Caso 1: Si le pasas directamente un string (ej. un correo)
        if (typeof origen === 'string') {
            responsable = origen;
        } 
        // Caso 2: Si le pasas el objeto req de Express (con o sin user)
        else if (typeof origen === 'object' && origen !== null) {
            responsable = origen.user?.correo || origen.body?.correo || 'Sistema';
        }

        const { error } = await supabase.from('historial').insert({
            responsable,
            accion,
            entidad,
            detalles: detalles || null
        })

        if (error) console.error('No se pudo registrar el historial:', error.message)
    } catch (e) {
        console.error('No se pudo registrar el historial:', e)
    }
}