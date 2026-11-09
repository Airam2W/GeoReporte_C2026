export function estadoIDAAccion(estado_id) {
    const accion = estado_id === 1 ? 'Poner en Pendiente':
                estado_id === 2 ? 'Poner en Revisión' :
                estado_id === 3 ? 'Rechazar' :
                estado_id === 4 ? 'Finalizar' :
                estado_id === 5 ? 'Turnar' :
                estado_id === 6 ? 'Devolver':
                estado_id === 7 ? 'Poner en Proceso' :
                estado_id === 8 ? 'Poner en Pendiente de Finalización' : 'Actualizar Estado Invalido'
                
    return accion
}

export function estadoIDADetalle(estado_id) {
    const detalle = estado_id === 1 ? 'Pendiente' :
                estado_id === 2 ? 'en Revisión' :
                estado_id === 3 ? 'Rechazado' :
                estado_id === 4 ? 'Finalizado' :
                estado_id === 5 ? 'Turnado' :
                estado_id === 6 ? 'Devuelto' :
                estado_id === 7 ? 'en Proceso' :
                estado_id === 8 ? 'Pendiente de Finalización' : 'Estado Invalido'
    return detalle
}

export function categoriaHistorialIDAAccion(categoria_historial_id) {
    const accion = categoria_historial_id === 1 ? 'Devolver' :
                categoria_historial_id === 2 ? 'Rechazar' :
                categoria_historial_id === 3 ? 'Confirmar Finalización' :
                categoria_historial_id === 4 ? 'Actualizar' :
                categoria_historial_id === 5 ? 'Aceptar Finalización' :
                categoria_historial_id === 6 ? 'Denegar Finalización' :
                categoria_historial_id === 7 ? 'Turnar' : 'Actualizar Categoria Invalida'
    return accion
}

export function categoriaHistorialIDADetalle(categoria_historial_id) {
    const detalle = categoria_historial_id === 1 ? 'Devuelto' :
                categoria_historial_id === 2 ? 'Rechazado' :
                categoria_historial_id === 3 ? 'Confirmado de Finalización' :
                categoria_historial_id === 4 ? 'Actualizado' :
                categoria_historial_id === 5 ? 'Aceptado de Finalización' :
                categoria_historial_id === 6 ? 'Denegado de Finalización' :
                categoria_historial_id === 7 ? 'Turnado' : 'Categoria Invalida'
    return detalle
}