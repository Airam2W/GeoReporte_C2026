import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CrearReporte from '../views/CrearReporte.vue'
import PanelAdministrador from '../views/PanelAdministrador.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/reporte', component: CrearReporte },
  { path: '/dashboard', component: PanelAdministrador }
]

const router = createRouter({
  history: createWebHashHistory('/GeoReporte_C2026/'),
  routes,
})


export default router
