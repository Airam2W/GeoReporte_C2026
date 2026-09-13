<script setup lang="ts">
import { useRouter } from 'vue-router'
import { verEstadoReporte, mostrarEstadoReporte } from '../logic/home'
const router = useRouter()

const irAReporte = () => {
  router.push('/reporte')
}

</script>

<template>
  <div class="home">
    <header class="home-header">
      <img src="../assets/logo.png" alt="Logo GeoReporte" class="logo" />
      <h1 class="titulo">GeoReporte</h1>
      <p class="descripcion">
        Plataforma ciudadana del Ayuntamiento de Culiacán para gestionar reportes de servicios públicos.
      </p>
    </header>

    <main class="home-main">
      <section class="acciones">
        <h2>¿Quieres hacer un reporte?</h2>
        <button class="btn btn-verde" @click="irAReporte">Crear reporte</button>
      </section>

      <section class="acciones">
        <h2>Ver estado de mi reporte</h2>
        <button class="btn btn-cafe" @click="verEstadoReporte">Ver reporte</button>
      </section>
    </main>
  </div>
</template>


<style src="../assets/home.css"></style>


