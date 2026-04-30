<script setup>
import { computed } from 'vue'
import { useDashboardStore } from '@/stores/dashboard.js'
import { priorityActionChips } from '@/utils/aggregateByBounds.js'
import { useClock } from '@/composables/useClock.js'
import { useWeather } from '@/composables/useWeather.js'
import { healthVi, riskVi } from '@/utils/viLabels.js'

const store = useDashboardStore()
const { now, formatDate, formatTime } = useClock()
const { loading, error, data } = useWeather((ms) => store.setWindSpeed(ms))

const sel = computed(() => store.selectedFeature)

/** Only rows that render at least one chip (same list as the tag strip). */
const priorityTop = computed(() =>
  store.priorityList.filter((f) => priorityActionChips(f).length > 0).slice(0, 14),
)

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

.wind-banner {
  background: rgba(245, 158, 11, 0.25);
  color: #92400e;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
}

.list-item {
  padding: 0.45rem 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  font-size: 0.85rem;
}

.list-item-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.5rem;
  margin-bottom: 0.25rem;
}

.list-item-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.id {
  font-weight: 700;
  color: var(--color-primary);
}

.tree-name {
  font-size: 0.78rem;
  color: var(--color-muted);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag {
  font-size: 0.65rem;
  background: rgba(240, 90, 35, 0.15);
  color: var(--color-secondary);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-weight: 600;
}

.tag-health {
  background: rgba(245, 158, 11, 0.22);
  color: #92400e;
}

.tag-risk {
  background: rgba(30, 64, 175, 0.12);
  color: #1e3a8a;
}

</style>
