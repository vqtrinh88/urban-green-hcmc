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
  <div class="right-inner scroll-y">
    <section class="block block-intro-right">
      <h2>TP. Hồ Chí Minh</h2>
      <p class="clock">{{ formatTime(now) }}</p>
      <p class="muted">{{ formatDate(now) }}</p>
    </section>

    <section class="block">
      <h2>Môi trường</h2>
      <p v-if="loading" class="muted">Đang tải dữ liệu thời tiết…</p>
      <p v-else-if="error" class="badge-err">{{ error }}</p>
      <div v-else class="weather-grid">
        <div class="kpi-card">
          <div class="label">Nhiệt độ</div>
          <div class="value">{{ data.tempC.toFixed(1) }}°C</div>
        </div>
        <div class="kpi-card">
          <div class="label">Gió</div>
          <div class="value">{{ data.windMs.toFixed(1) }} m/s</div>
        </div>
        <div class="kpi-card">
          <div class="label">Chất lượng không khí</div>
          <div class="value">{{ data.aqiLabel }}</div>
        </div>
      </div>
      <p v-if="data.source === 'mock'" class="muted">Chưa có khóa OpenWeather — đang dùng dữ liệu mẫu.</p>
    </section>

    <div v-if="store.showWindBanner" class="wind-banner">
      Gió mạnh và có cây tán trung bình hoặc nguy cơ trung bình trở lên trong vùng nhìn — xem mục ưu tiên.
    </div>

    <section v-if="!sel" class="block">
      <h2>Ưu tiên xử lý</h2>
      <p class="muted">Cây có ít nhất một nhãn: nguy cơ, giải phóng hành lang, tán trung bình theo dõi, hoặc đánh dấu ưu tiên.</p>
      <ul class="list">
        <li v-for="f in priorityTop" :key="f.properties.assetId" class="list-item">
          <div class="list-item-head">
            <span class="id">{{ f.properties.assetId }}</span>
            <span class="tree-name" :title="f.properties.scientificName">{{ f.properties.commonName }}</span>
          </div>
          <div class="list-item-tags">
            <span
              v-for="c in priorityActionChips(f)"
              :key="f.properties.assetId + '-' + c.id"
              class="tag"
              :class="{ 'tag-health': c.tone === 'health', 'tag-risk': c.tone === 'risk' }"
            >{{ c.text }}</span>
          </div>
        </li>
      </ul>
      <p v-if="!priorityTop.length" class="muted">Không có cây cần xử lý ưu tiên trong danh mục.</p>
    </section>

    <section v-else class="block detail">
      <div class="detail-head">
        <h2>Hồ sơ cây</h2>
        <button type="button" class="btn btn-secondary" @click="store.clearSelection()">Quay lại</button>
      </div>
      <p class="sci">
        {{ sel.properties.commonName }} /
        <i>{{ sel.properties.scientificName }}</i>
      </p>
      <p class="muted mono">{{ sel.properties.assetId }}</p>

      <h3>Sinh trắc</h3>
      <ul class="kv">
        <li><span>Chiều cao</span><strong>{{ sel.properties.heightM.toFixed(1) }} m</strong></li>
        <li><span>Chu vi thân</span><strong>{{ sel.properties.perimeterCm.toFixed(1) }} cm</strong></li>
        <li><span>ĐK thân (DBH)</span><strong>{{ sel.properties.dbhCm.toFixed(1) }} cm</strong></li>
        <li><span>Diện tích tán</span><strong>{{ sel.properties.canopySpreadAreaM2.toFixed(1) }} m²</strong></li>
        <li><span>Đường kính tán</span><strong>{{ sel.properties.canopyDiameterM.toFixed(1) }} m</strong></li>
        <li><span>Suy giảm ngọn</span><strong>{{ sel.properties.crownDiebackPct }} %</strong></li>
      </ul>

      <h3>Định lượng hệ sinh thái</h3>
      <ul class="kv">
        <li><span>Sinh khối trên mặt đất</span><strong>{{ fmtTonnes(sel.properties.agbTonnes) }} t</strong></li>
        <li><span>CO₂ tích trữ</span><strong>{{ fmtTonnes(sel.properties.co2StoredTonnes) }} t</strong></li>
        <li><span>CO₂ hàng năm (ước tính)</span><strong>{{ fmtTonnes(sel.properties.annualCo2Tonnes) }} t</strong></li>
        <li><span>O₂ hàng năm (ước tính)</span><strong>{{ fmtTonnes(sel.properties.annualO2Tonnes) }} t</strong></li>
      </ul>

      <h3>Quản lý &amp; Bảo dưỡng</h3>
      <ul class="kv">
        <li><span>Sức khỏe tán</span><strong>{{ healthVi(sel.properties.health) }}</strong></li>
        <li><span>Nguy cơ</span><strong>{{ riskVi(sel.properties.riskRating) }}</strong></li>
        <li><span>Cắt tỉa gần nhất</span><strong>{{ sel.properties.lastPruningDate }}</strong></li>
        <li><span>Cắt tỉa tiếp theo</span><strong>{{ sel.properties.nextPruningDate }}</strong></li>
        <li><span>Kiểm tra tiếp theo</span><strong>{{ sel.properties.nextInspectionDate }}</strong></li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.right-inner {
  padding: 1rem;
  height: 100%;
}

.block {
  margin-bottom: 1.25rem;
}

.block-intro-right {
  text-align: right;
}

.clock {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0.25rem 0 0;
}

.weather-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, auto);
  gap: 0.5rem;
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

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.sci {
  margin: 0.35rem 0;
}

.mono {
  font-family: ui-monospace, monospace;
}

.kv {
  list-style: none;
  padding: 0;
  margin: 0.35rem 0 0.75rem;
  font-size: 0.85rem;
}

.kv li {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0;
  border-bottom: 1px dashed rgba(15, 23, 42, 0.06);
}

.kv span {
  color: var(--color-muted);
}
</style>
