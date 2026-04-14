import { ref, onMounted, onUnmounted } from 'vue'
import { CORRIDOR_START, CORRIDOR_END } from '@/utils/mockTrees.js'

const centroid = {
  lat: (CORRIDOR_START.lat + CORRIDOR_END.lat) / 2,
  lng: (CORRIDOR_START.lng + CORRIDOR_END.lng) / 2,
}

function mockWeather() {
  return {
    source: 'mock',
    tempC: 31,
    windMs: 4.2,
    aqiLabel: 'Trung bình (dữ liệu mẫu)',
    aqiValue: 3,
    humidity: 72,
  }
}

/**
 * Read key from Vite env. Supports VITE_OPENWEATHER_API_KEY (preferred) or VITE_OPENWEATHER_KEY.
 * Trims whitespace and strips a single pair of surrounding quotes often pasted from docs.
 */
function readOpenWeatherKey() {
  const candidates = [
    import.meta.env.VITE_OPENWEATHER_API_KEY,
    import.meta.env.VITE_OPENWEATHER_KEY,
  ]
  for (const raw of candidates) {
    if (raw == null) continue
    let s = String(raw).trim()
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim()
    }
    if (s) return s
  }
  return ''
}

async function parseJsonOrEmpty(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

/**
 * OpenWeather Current Weather 2.5 + Air Pollution 2.5 (same API key as dashboard).
 * Uses URLSearchParams so the key is encoded correctly. AQI is optional if that call fails.
 */
export function useWeather(storeSetWind) {
  const loading = ref(true)
  const error = ref(null)
  const data = ref(mockWeather())

  async function fetchWeather() {
    loading.value = true
    error.value = null
    const key = readOpenWeatherKey()
    const lat = Number(import.meta.env.VITE_OPENWEATHER_LAT) || centroid.lat
    const lon = Number(import.meta.env.VITE_OPENWEATHER_LON) || centroid.lng

    if (!key) {
      data.value = mockWeather()
      storeSetWind?.(data.value.windMs)
      loading.value = false
      return
    }

    try {
      const weatherParams = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        units: 'metric',
        appid: key,
      })
      const wRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?${weatherParams.toString()}`,
      )
      const wBody = await parseJsonOrEmpty(wRes)

      if (!wRes.ok) {
        const msg = wBody.message || wBody.cod || ''
        throw new Error(
          `Weather HTTP ${wRes.status}${msg ? `: ${msg}` : ''}. Check VITE_OPENWEATHER_API_KEY and restart the dev server after changing .env.`,
        )
      }

      const aqiParams = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        appid: key,
      })
      const aRes = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?${aqiParams.toString()}`,
      )
      const aBody = await parseJsonOrEmpty(aRes)

      let aqi = 1
      let aqiLabel = 'Good'
      if (aRes.ok && aBody.list?.[0]?.main?.aqi != null) {
        aqi = aBody.list[0].main.aqi
        const aqiLabels = {
          1: 'Tốt',
          2: 'Khá',
          3: 'Trung bình',
          4: 'Kém',
          5: 'Rất kém',
        }
        aqiLabel = aqiLabels[aqi] ?? String(aqi)
      } else if (!aRes.ok) {
        aqiLabel = `Không lấy được AQI (HTTP ${aRes.status})`
      }

      data.value = {
        source: 'openweather',
        tempC: wBody.main?.temp ?? 0,
        windMs: wBody.wind?.speed ?? 0,
        aqiLabel,
        aqiValue: aqi,
        humidity: wBody.main?.humidity ?? 0,
      }
      storeSetWind?.(data.value.windMs)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      data.value = mockWeather()
      storeSetWind?.(data.value.windMs)
    } finally {
      loading.value = false
    }
  }

  let interval
  onMounted(() => {
    fetchWeather()
    interval = setInterval(fetchWeather, 5 * 60 * 1000)
  })
  onUnmounted(() => {
    if (interval) clearInterval(interval)
  })

  return { loading, error, data, refetch: fetchWeather }
}
