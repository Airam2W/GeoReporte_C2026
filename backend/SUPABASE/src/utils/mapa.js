export const DISTANCIA_DUPLICADO_METROS = 15
export const ESTADOS_CERRADOS = [3, 4] // 3 = Rechazado, 4 = Finalizado: no cuentan como duplicado ni salen en el mapa
export const LIMITES_CULIACAN = { minLat: 24.58, maxLat: 25.02, minLng: -107.6, maxLng: -107.1 }

export const aRadianes = (g) => (g * Math.PI) / 180

// Distancia en metros entre dos coordenadas (fórmula de Haversine)
export const distanciaMetros = (lat1, lng1, lat2, lng2) => {
    const R = 6371000
    const dLat = aRadianes(lat2 - lat1)
    const dLng = aRadianes(lng2 - lng1)
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) * Math.sin(dLng / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(a))
}