import { ref, onMounted, onUnmounted } from 'vue'

export function useClock() {
  const now = ref(new Date())
  let id

  onMounted(() => {
    id = setInterval(() => {
      now.value = new Date()
    }, 1000)
  })

  onUnmounted(() => {
    if (id) clearInterval(id)
  })

  function formatDate(d) {
    return d.toLocaleDateString('vi-VN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  function formatTime(d) {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return { now, formatDate, formatTime }
}
