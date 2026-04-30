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
    // Format date as "Weekday, DD/MM/YYYY" (e.g., "Th 6, 05/07/2024")
    const weekday = d.toLocaleDateString('vi-VN', { weekday: 'short' })
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${weekday}, ${day}/${month}/${year}`
  }

  function formatTime(d) {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return { now, formatDate, formatTime }
}
