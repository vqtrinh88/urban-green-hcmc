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
      labels: { boxWidth: 10, font: { size: 10 } },
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
    <h2>Hệ sinh thái</h2>
    <p class="muted">Số liệu cập nhật theo phạm vi bản đồ hiện tại.</p>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">Lượng cây trong vùng</div>
        <div class="value">{{ fmt(agg.count, 0) }}</div>
      </div>
      <div class="kpi-card">
        <div class="label">Chiều cao TB (m)</div>
        <div class="value">{{ fmt(agg.avgHeightM) }}</div>
      </div>
      <div class="kpi-card">
        <div class="label">ĐK thân TB (cm)</div>
        <div class="value">{{ fmt(agg.avgDbhCm) }}</div>
      </div>
      <div class="kpi-card">
        <div class="label">Tổng sinh khối (t)</div>
        <div class="value">{{ fmt(agg.totalAgbTonnes, 0) }}</div>
      </div>
      <div class="kpi-card">
        <div class="label">CO₂ tích trữ (t)</div>
        <div class="value">{{ fmt(agg.totalCo2StoredTonnes, 0) }}</div>
      </div>
      <div class="kpi-card">
        <div class="label">CO₂ hàng năm (ước tính)</div>
        <div class="value">{{ fmt(agg.totalAnnualCo2Tonnes, 0) }}</div>
      </div>
      <div class="kpi-card">
        <div class="label">O₂ hàng năm (ước tính)</div>
        <div class="value">{{ fmt(agg.totalAnnualO2Tonnes, 0) }}</div>
      </div>
    </div>

    <h3>Phân bố sức khỏe tán</h3>
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
</template>

<style scoped>
.left-inner {
  padding: 1rem;
  height: 100%;
}

.kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.chart-wrap {
  height: 220px;
  position: relative;
  margin-top: 0.5rem;
}

h3 {
  font-size: 0.95rem;
  margin-top: 0.5rem;
}
</style>
