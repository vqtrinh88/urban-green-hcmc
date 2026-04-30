<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { useDashboardStore } from '@/stores/dashboard.js'
import { HEALTH_CHART_COLORS } from '@/utils/aggregateByBounds.js'
import { INVENTORY_HEALTH_CHART_ORDER } from '@/utils/mockTrees.js'
import { HEALTH_CHART_LEGEND_VI } from '@/utils/viLabels.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const store = useDashboardStore()

const agg = computed(() => store.aggregates)

const chartData = computed(() => {
  const h = agg.value.healthCounts
  const keys = INVENTORY_HEALTH_CHART_ORDER.filter((k) => (h[k] ?? 0) > 0)
  const labels = keys.map((k) => HEALTH_CHART_LEGEND_VI[k] ?? k)
  const data = keys.map((k) => h[k])
  const backgroundColor = keys.map((k) => HEALTH_CHART_COLORS[k])
  return {
    labels,
    datasets: [{ data, backgroundColor, borderWidth: 0 }],
  }
})

/** Remount Chart.js when bounds/health counts change (avoids stale arc data). */
const healthChartKey = computed(() => {
  const h = agg.value.healthCounts
  return INVENTORY_HEALTH_CHART_ORDER.map((k) => `${k}:${h[k] ?? 0}`).join('|')
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 10,
        font: { size: 10 },
        color: 'rgba(255, 255, 255, 0.88)',
      },
    },
  },
  cutout: '58%',
}

function fmt(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return '—'
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}
</script>

<template>
  <div class="left-inner scroll-y">
    <div class="overlay-stack">
      <section class="overlay-card" aria-label="Số lượng và sinh trắc trung bình">
        <h3>Thống kê cây trong vùng</h3>
        <div class="overlay-card-content">
          <div class="kpi-grid kpi-grid-3">
            <div class="kpi-card">
              <div class="label kpi-label">Lượng cây trong vùng</div>
              <div class="value kpi-value-label">{{ fmt(agg.count, 0) }}</div>
            </div>
            <div class="kpi-card">
              <div class="label kpi-label">Chiều cao TB (m)</div>
              <div class="value kpi-value-label">{{ fmt(agg.avgHeightM) }}</div>
            </div>
            <div class="kpi-card">
              <div class="label kpi-label">ĐK thân TB (cm)</div>
              <div class="value kpi-value-label">{{ fmt(agg.avgDbhCm) }}</div>
            </div>
          </div>
        </div>
      </section>

      <section class="overlay-card" aria-label="Định lượng hệ sinh thái">
        <h3>Định lượng hệ sinh thái</h3>
        <div class="overlay-card-content">
          <ul class="kv">
            <li><span>Tổng sinh khối (t)</span><strong>{{ fmt(agg.totalAgbTonnes, 0) }}</strong></li>
            <li><span>CO₂ tích trữ (t)</span><strong>{{ fmt(agg.totalCo2StoredTonnes, 0) }}</strong></li>
            <li><span>CO₂ hàng năm (ước tính)</span><strong>{{ fmt(agg.totalAnnualCo2Tonnes, 0) }}</strong></li>
            <li><span>O₂ hàng năm (ước tính)</span><strong>{{ fmt(agg.totalAnnualO2Tonnes, 0) }}</strong></li>
          </ul>
        </div>
      </section>

      <section class="overlay-card overlay-card-chart" aria-label="Phân bố sức khỏe tán">
        <h3>Phân bố sức khỏe tán</h3>
        <div class="overlay-card-content">
          <div class="chart-wrap">
            <Doughnut
              v-if="agg.count > 0"
              :key="healthChartKey"
              :data="chartData"
              :options="chartOptions"
            />
            <p v-else class="muted">Di chuyển bản đồ để hiển thị cây trong vùng nhìn.</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.left-inner {
  height: 100%;
  background: transparent;
}

.intro {
  margin-bottom: 0.85rem;
}

.chart-wrap {
  height: 220px;
  position: relative;
  margin-top: 0.25rem;
}
</style>
