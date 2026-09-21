import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CrearReporte from '../views/CrearReporte.vue'
import PanelAdministrador from '../views/PanelAdministrador.vue'
import PanelDirector from '../views/PanelDirector.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/reporte', component: CrearReporte },
  { path: '/dashboard', component: PanelAdministrador },
  { path: '/management', component: PanelDirector },
]

const router = createRouter({
  history: createWebHashHistory('/GeoReporte_C2026/'),
  routes,
})

router.beforeEach((to, from, next) => {
  const adminSession = localStorage.getItem('adminSession')

  if (to.path === '/dashboard' && !adminSession) {
    next('/') // no hay sesión -> redirige al home
  } else {
    next() // hay sesión -> deja pasar
  }
})



export default router
