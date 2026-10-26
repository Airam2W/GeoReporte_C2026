<template>
  <div class="app-container">
    <router-view />
    <Cargando />
  </div>
</template>


<script setup lang="ts">
import Cargando from './components/Cargando.vue'
</script>