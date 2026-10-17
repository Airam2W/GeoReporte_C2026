import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CrearReporte from '../views/CrearReporte.vue'
import PanelAdministrador from '../views/PanelAdministrador.vue'
import PanelDirector from '../views/PanelDirector.vue'
import PanelAdminExterno from '@/views/PanelAdminExterno.vue'
import PanelSupervisor from '@/views/PanelSupervisor.vue'
import PanelJefe from '@/views/PanelJefe.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/reporte', component: CrearReporte },
  { path: '/dashboard', component: PanelAdministrador },
  { path: '/management', component: PanelDirector },
  { path: '/external', component: PanelAdminExterno },
  { path: '/supervisor', component: PanelSupervisor },
  { path: '/jefe', component: PanelJefe },
]

const router = createRouter({
  history: createWebHashHistory('/GeoReporte_C2026/'),
  routes,
})

router.beforeEach((to, from, next) => {
  const userSession = localStorage.getItem('userSession')

  if (to.path === '/dashboard' && !userSession) {
    next('/') // no hay sesión -> redirige al home
  } else {
    next() // hay sesión -> deja pasar
  }
})



export default router
