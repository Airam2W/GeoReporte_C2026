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

const adminSession = localStorage.getItem('adminSession')
if (adminSession) {
  const session = JSON.parse(adminSession)
  router.push(session.tipo_id === 1 ? '/management' : '/dashboard')
}

