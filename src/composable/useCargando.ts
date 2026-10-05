import { ref } from 'vue'

const visible = ref(false)

export function useCargando() {
  function mostrarCargando() {
    visible.value = true
  }

  function ocultarCargando() {
    visible.value = false
  }

  return { visible, mostrarCargando, ocultarCargando }
}