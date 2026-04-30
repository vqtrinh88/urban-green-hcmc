<script setup>
import { computed } from 'vue'
import { useDashboardStore } from '@/stores/dashboard.js'
import { useClock } from '@/composables/useClock.js'
import { useWeather } from '@/composables/useWeather.js'
import { healthVi, riskVi } from '@/utils/viLabels.js'

const store = useDashboardStore()
const { now, formatDate, formatTime } = useClock()
const { loading, error, data } = useWeather((ms) => store.setWindSpeed(ms))

const sel = computed(() => store.selectedFeature)

function fmtTonnes(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
</script>

<template>
  <div class="right-inner">
    <div class="overlay-stack">
      <section class="overlay-card overlay-card-intro" aria-label="Thời gian địa phương">
        <h3>TP. Hồ Chí Minh</h3>
        <div class="overlay-card-content">
          <p class="clock">{{ formatDate(now) }} - {{ formatTime(now) }}</p>
        </div>
      </section>

      <section class="overlay-card" aria-label="Thời tiết và chất lượng không khí">
        <h3>Môi trường</h3>
        <div class="overlay-card-content">
          <p v-if="loading" class="muted">Đang tải dữ liệu thời tiết…</p>
          <p v-else-if="error" class="badge-err">{{ error }}</p>
          <div v-else class="weather-grid">
            <div class="kpi-card">
              <div class="label kpi-label">Nhiệt độ</div>
              <div class="value kpi-value-label">{{ data.tempC.toFixed(1) }}°C</div>
            </div>
            <div class="kpi-card">
              <div class="label kpi-label">Gió</div>
              <div class="value kpi-value-label">{{ data.windMs.toFixed(1) }} m/s</div>
            </div>
            <div class="kpi-card weather-kpi-full">
              <div class="label kpi-label">Chất lượng không khí</div>
              <div class="value kpi-value-label">{{ data.aqiLabel }}</div>
            </div>
          </div>
          <p v-if="!loading && !error && data.source === 'mock'" class="muted mock-note">
            Chưa có khóa OpenWeather — đang dùng dữ liệu mẫu.
          </p>
        </div>
      </section>

      <section v-if="sel" class="overlay-card overlay-card-detail" aria-label="Hồ sơ cây đã chọn">
        <h3>Hồ sơ cây</h3>
        <div class="overlay-card-content scroll-y overlay-card-detail-body">
          <p class="sci">
            {{ sel.properties.commonName }} /
            <i>{{ sel.properties.scientificName }}</i>
          </p>
          <p class="muted mono">{{ sel.properties.assetId }}</p>

          <h4>Sinh trắc</h4>
          <ul class="kv">
            <li><span>Chiều cao</span><strong>{{ sel.properties.heightM.toFixed(1) }} m</strong></li>
            <li><span>Chu vi thân</span><strong>{{ sel.properties.perimeterCm.toFixed(1) }} cm</strong></li>
            <li><span>ĐK thân (DBH)</span><strong>{{ sel.properties.dbhCm.toFixed(1) }} cm</strong></li>
            <li><span>Diện tích tán</span><strong>{{ sel.properties.canopySpreadAreaM2.toFixed(1) }} m²</strong></li>
            <li><span>Đường kính tán</span><strong>{{ sel.properties.canopyDiameterM.toFixed(1) }} m</strong></li>
            <li><span>Suy giảm ngọn</span><strong>{{ sel.properties.crownDiebackPct }} %</strong></li>
          </ul>

          <h4>Định lượng hệ sinh thái</h4>
          <ul class="kv">
            <li><span>Sinh khối trên mặt đất</span><strong>{{ fmtTonnes(sel.properties.agbTonnes) }} t</strong></li>
            <li><span>CO₂ tích trữ</span><strong>{{ fmtTonnes(sel.properties.co2StoredTonnes) }} t</strong></li>
            <li><span>CO₂ hàng năm (ước tính)</span><strong>{{ fmtTonnes(sel.properties.annualCo2Tonnes) }} t</strong></li>
            <li><span>O₂ hàng năm (ước tính)</span><strong>{{ fmtTonnes(sel.properties.annualO2Tonnes) }} t</strong></li>
          </ul>

          <h4>Quản lý &amp; Bảo dưỡng</h4>
          <ul class="kv">
            <li><span>Sức khỏe tán</span><strong>{{ healthVi(sel.properties.health) }}</strong></li>
            <li><span>Nguy cơ</span><strong>{{ riskVi(sel.properties.riskRating) }}</strong></li>
            <li><span>Cắt tỉa gần nhất</span><strong>{{ sel.properties.lastPruningDate }}</strong></li>
            <li><span>Cắt tỉa tiếp theo</span><strong>{{ sel.properties.nextPruningDate }}</strong></li>
            <li><span>Kiểm tra tiếp theo</span><strong>{{ sel.properties.nextInspectionDate }}</strong></li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.right-inner {
  height: 100%;
  background: transparent;
  overflow: visible;
}

/* Scroll only the tree detail body; title strip stays fixed */
.overlay-card-detail .overlay-card-detail-body {
  max-height: min(46vh, 380px);
  min-height: 0;
}



</style>
