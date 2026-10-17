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

const userSession = localStorage.getItem('userSession')
if (userSession) {
  const session = JSON.parse(userSession)
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
