<script setup>
import { ref, nextTick } from 'vue'
import LeftPanel from '@/components/LeftPanel.vue'
import MapPanel from '@/components/MapPanel.vue'
import RightPanel from '@/components/RightPanel.vue'
import { useDashboardStore } from '@/stores/dashboard.js'

const store = useDashboardStore()

const leftCollapsed = ref(false)
const rightCollapsed = ref(false)

const PANEL_COL_TRANSITION_MS = 230

function bumpMapResize() {
  nextTick(() => {
    requestAnimationFrame(() => {
      store.requestMapResize()
      window.dispatchEvent(new Event('resize'))
    })
    window.setTimeout(() => {
      store.requestMapResize()
      window.dispatchEvent(new Event('resize'))
    }, PANEL_COL_TRANSITION_MS)
  })
}

function toggleLeft() {
  leftCollapsed.value = !leftCollapsed.value
  bumpMapResize()
}

function toggleRight() {
  rightCollapsed.value = !rightCollapsed.value
  bumpMapResize()
}

function toggleMode() {
  store.setMapMode(store.mapMode === '3d' ? '2d' : '3d')
}
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-title">UrbanGreen HCMC</span>
        <!-- <span class="brand-sub">ESG</span> -->
      </div>
      <div class="topbar-actions">
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="!store.selectedTreeId"
          @click="store.clearSelection()"
        >
          Bỏ chọn cây
        </button>
        <button type="button" class="btn btn-primary" @click="toggleMode">
          {{ store.mapMode === '3d' ? 'Bản đồ 2D' : 'Bản đồ 3D' }}
        </button>
      </div>
    </header>
    <div
      class="grid"
      :class="{
        'is-left-collapsed': leftCollapsed,
        'is-right-collapsed': rightCollapsed,
      }"
    >
      <aside class="panel panel-left" :class="{ collapsed: leftCollapsed }">
        <div id="left-panel-region" class="panel-body">
          <LeftPanel />
        </div>
        <button
          type="button"
          class="panel-fab panel-fab-left"
          :aria-expanded="!leftCollapsed"
          aria-controls="left-panel-region"
          :aria-label="leftCollapsed ? 'Mở rộng bảng hệ sinh thái' : 'Thu gọn bảng hệ sinh thái'"
          @click="toggleLeft"
        >
          <span class="chev" aria-hidden="true">{{ leftCollapsed ? '›' : '‹' }}</span>
        </button>
      </aside>
      <main class="map-stage">
        <MapPanel />
      </main>
      <aside class="panel panel-right" :class="{ collapsed: rightCollapsed }">
        <div id="right-panel-region" class="panel-body">
          <RightPanel />
        </div>
        <button
          type="button"
          class="panel-fab panel-fab-right"
          :aria-expanded="!rightCollapsed"
          aria-controls="right-panel-region"
          :aria-label="rightCollapsed ? 'Mở rộng bảng thông tin' : 'Thu gọn bảng thông tin'"
          @click="toggleRight"
        >
          <span class="chev" aria-hidden="true">{{ rightCollapsed ? '‹' : '›' }}</span>
        </button>
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
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  background: var(--color-primary);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.brand-title {
  font-weight: 700;
  font-size: 1.05rem;
  color: #fff;
  letter-spacing: -0.02em;
}

.brand-sub {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.82);
  font-weight: 600;
}

.topbar-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(0, 3fr) minmax(220px, 1fr);
  gap: 0;
  transition: grid-template-columns 0.22s ease;
}

.grid.is-left-collapsed {
  grid-template-columns: 2.75rem minmax(0, 3fr) minmax(220px, 1fr);
}

.grid.is-right-collapsed {
  grid-template-columns: minmax(220px, 1fr) minmax(0, 3fr) 2.75rem;
}

.grid.is-left-collapsed.is-right-collapsed {
  grid-template-columns: 2.75rem minmax(0, 3fr) 2.75rem;
}

.panel {
  position: relative;
  min-width: 0;
  min-height: 0;
  height: 100%;
  background: var(--color-bg);
  border-right: 1px solid rgba(20, 80, 140, 0.08);
  overflow: hidden;
}

.panel-body {
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.panel-right {
  border-right: none;
  border-left: 1px solid rgba(20, 80, 140, 0.08);
}

.panel.collapsed .panel-body {
  display: none;
}

.panel-fab {
  position: absolute;
  z-index: 20;
  width: 2rem;
  height: 2rem;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-panel);
  color: var(--color-primary);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(20, 80, 140, 0.14);
  transition:
    background 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.panel-fab:hover {
  background: #fff;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(20, 80, 140, 0.2);
}

.panel-fab:focus-visible {
  outline: 2px solid var(--color-secondary);
  outline-offset: 2px;
}

.panel-fab-left {
  top: 0.5rem;
  right: 0.5rem;
}

.panel-fab-right {
  top: 0.5rem;
  left: 0.5rem;
}

.panel-left.collapsed .panel-fab-left,
.panel-right.collapsed .panel-fab-right {
  top: 50%;
  left: 50%;
  right: auto;
  transform: translate(-50%, -50%);
}

.map-stage {
  min-width: 0;
  min-height: 0;
  position: relative;
}

@media (max-width: 1100px) {
  .grid,
  .grid.is-left-collapsed,
  .grid.is-right-collapsed,
  .grid.is-left-collapsed.is-right-collapsed {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(280px, 45vh) auto;
  }

  .panel-left {
    border-right: none;
    border-bottom: 1px solid rgba(20, 80, 140, 0.08);
    max-height: none;
  }

  .panel-left:not(.collapsed) {
    max-height: 220px;
  }

  .panel-left.collapsed {
    max-height: 2.75rem;
  }

  .panel-right {
    border-left: none;
    border-top: 1px solid rgba(20, 80, 140, 0.08);
    max-height: none;
  }

  .panel-right:not(.collapsed) {
    max-height: 320px;
  }

  .panel-right.collapsed {
    max-height: 2.75rem;
  }

  .panel-fab-left {
    top: 0.4rem;
    right: 0.4rem;
  }

  .panel-fab-right {
    top: 0.4rem;
    left: 0.4rem;
  }

  .panel-left.collapsed .panel-fab-left,
  .panel-right.collapsed .panel-fab-right {
    top: 50%;
    left: 50%;
    right: auto;
    transform: translate(-50%, -50%);
  }
}
</style>
