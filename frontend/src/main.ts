import './assets/main.css'
import './assets/CrearReporte.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// 1. Leemos únicamente el token de autenticación
const userToken = localStorage.getItem('userToken')

if (userToken) {
  try {
    // 2. Decodificamos el payload del JWT (segunda sección)
    const base64Url = userToken.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    
    const session = JSON.parse(jsonPayload)

    // 3. Evaluamos el tipo_id extraído del token utilizando tu misma estructura lógica
    if (session && session.tipo_id) {
      router.push(
        session.tipo_id === 1
          ? '/management'
          : session.tipo_id === 2
            ? '/dashboard'
            : session.tipo_id === 3
              ? '/supervisor'
              : session.tipo_id === 4
                ? '/jefe'
                : session.tipo_id === 6
                  ? '/external'
                  : '/',
      )
    }
  } catch (error) {
    console.error("Error al procesar el token de inicio automático:", error)
    localStorage.removeItem('userToken') // Limpieza si el token está corrupto
    router.push('/')
  }
}
