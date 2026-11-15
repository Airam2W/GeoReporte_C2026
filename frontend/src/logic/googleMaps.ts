export const abrirGoogleMaps = (domicilio: string) => {
  if (!domicilio) return

  const destino = `${domicilio}, Culiacán, Sinaloa, México`

  // Mostrar el domicilio con un marcador en Google Maps
  const abrirSoloDestino = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (!navigator.geolocation) {
    abrirSoloDestino()
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const origen = `${position.coords.latitude},${position.coords.longitude}`

      const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origen)}&destination=${encodeURIComponent(destino)}&travelmode=driving`

      window.open(url, '_blank', 'noopener,noreferrer')
    },
    () => {
      abrirSoloDestino()
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
}
