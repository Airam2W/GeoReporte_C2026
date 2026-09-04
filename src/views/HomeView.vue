<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const irAReporte = () => {
  router.push('/reporte')
}
</script>

<template>
  <div class="home">
    <h1>¿Quieres hacer un reporte?</h1>
    <button @click="irAReporte">Crear reporte</button>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

/* MOBILE */
@media (max-width: 768px) {
  .home {
    justify-content: flex-start;
    align-items: stretch;
    height: auto;
    padding: 16px;
  }
}
</style>

