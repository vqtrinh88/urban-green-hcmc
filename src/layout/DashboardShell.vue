<script setup>
import { onMounted, nextTick } from 'vue'
import LeftPanel from '@/components/LeftPanel.vue'
import MapPanel from '@/components/MapPanel.vue'
import RightPanel from '@/components/RightPanel.vue'
import { useDashboardStore } from '@/stores/dashboard.js'
import logoUrl from '@/assets/logo.svg?url'

const store = useDashboardStore()

onMounted(() => {
  nextTick(() => {
    store.requestMapResize()
    window.dispatchEvent(new Event('resize'))
  })
})
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <img :src="logoUrl" alt="UrbanGreen logo" class="brand-logo" />
        <span class="brand-title">UrbanGreen HCMC</span>
      </div>
    </header>
    <div class="stage">
      <main class="map-stage">
        <MapPanel />
      </main>
      <aside class="panel panel-left" aria-label="Bảng hệ sinh thái">
        <div id="left-panel-region" class="panel-body">
          <LeftPanel />
        </div>
      </aside>
      <aside class="panel panel-right" aria-label="Bảng thông tin">
        <div id="right-panel-region" class="panel-body">
          <RightPanel />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 0;
}

.topbar {
  flex-shrink: 0;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 2rem;
  background: linear-gradient(90deg, #0a1628 0%, #0d2847 42%, var(--color-primary) 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset;
}

.brand {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.6rem;
}

.brand-logo {
  height: 32px;
  width: auto;
  display: block;
  flex-shrink: 0;
}

.brand-title {
  font-weight: 700;
  font-size: 1.2rem;
  color: #fff;
  letter-spacing: -0.02em;
}

/* Map fills the stage; side panels float above (transparent shell) */
.stage {
  position: relative;
  flex: 1;
  min-height: 0;
  isolation: isolate;
}

.map-stage {
  position: absolute;
  inset: 0;
  z-index: 0;
  min-width: 0;
  min-height: 0;
}

.panel {
  position: absolute;
  top: 0.75rem;
  bottom: 0.75rem;
  z-index: 2;
  width: clamp(20vw, 400px);
  max-width: min(42vw, 400px);
  min-width: 0;
  min-height: 0;
  background: transparent;
  border: none;
  overflow: visible;
  pointer-events: none;
}

.panel-left {
  left: 0.75rem;
}

.panel-right {
  right: 0.75rem;
}

.panel-body {
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  pointer-events: auto;
  background: transparent;
}

@media (max-width: 1100px) {
  .panel {
    width: auto;
    max-width: none;
    left: 0.5rem;
    right: 0.5rem;
  }

  .panel-left {
    top: 0.5rem;
    bottom: auto;
    max-height: min(42vh, 320px);
  }

  .panel-right {
    top: auto;
    bottom: 0.5rem;
    max-height: min(46vh, 380px);
  }
}
</style>
