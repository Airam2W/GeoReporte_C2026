<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<style>
.app-container {
  min-height: 100vh;
  background-color: #f0f0f0; /* color uniforme */
  display: flex;
  justify-content: center;
  align-items: center;
}

/* MOBILE */
@media (max-width: 768px) {
  .app-container {
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    padding: 12px;
  }
}
</style>
