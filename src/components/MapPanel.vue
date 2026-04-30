<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useDashboardStore } from '@/stores/dashboard.js'
import { MOCK_TREE_COLLECTION, CORRIDOR_START, CORRIDOR_END } from '@/utils/mockTrees.js'
import { addTreeLayers2d, setTreeCircleVisibility, TREES_HIT_LAYER_ID } from '@/map/treeLayer2d.js'
import { addBuildingExtrusionLayer, setBuildingLayerVisibility } from '@/map/buildingExtrusions.js'
import { addTreesMeshLayer, removeTreesMeshLayer, TREES_MESH_LAYER_ID } from '@/map/treeMeshLayer.js'
import { mountPopupTreePreview } from '@/map/popupTreePreview.js'
import { healthVi, riskVi } from '@/utils/viLabels.js'

const mapContainer = ref(null)
const mapError = ref('')
const store = useDashboardStore()

let map
/** @type {mapboxgl.Popup | null} */
let popup = null
/** @type {null | (() => void)} */
let disposePopupPreview = null

function syncBounds() {
  if (!map) return
  const b = map.getBounds()
  store.setMapBounds([
    [b.getWest(), b.getSouth()],
    [b.getEast(), b.getNorth()],
  ])
}

function treePopupHtml(feature, canvasId) {
  const p = feature.properties
  const [lng, lat] = feature.geometry.coordinates
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  return `
    <div class="ug-popup ug-popup-split" style="font-size:0.8rem;">
      <div class="ug-popup-info">
        <div class="ug-popup-section-title">${esc(p.assetId)}</div>
        <div class="ug-popup-section-body">
          <div class="ug-popup-id">${esc(p.commonName)}</div>
          <div class="ug-popup-meta">Sức khỏe tán: <strong>${esc(healthVi(p.health))}</strong></div>
          <div class="ug-popup-meta">Nguy cơ: <strong>${esc(riskVi(p.riskRating))}</strong></div>
          <div class="ug-popup-height">Cao ${Number(p.heightM).toFixed(2)} m</div>
          <div class="ug-popup-height">Đường kính tán ${Number(p.canopyDiameterM).toFixed(2)} m</div>
        </div>
      </div>
    </div>
  `
}

function onTreePopupClose() {
  if (disposePopupPreview) {
    disposePopupPreview()
    disposePopupPreview = null
  }
  store.clearSelection()
}

function showPopup(lngLat, feature) {
  if (disposePopupPreview) {
    disposePopupPreview()
    disposePopupPreview = null
  }
  if (popup) {
    popup.off('close', onTreePopupClose)
    popup.remove()
  }

  const safeId = String(feature.properties?.assetId ?? 'tree').replace(/[^a-zA-Z0-9_-]/g, '_')
  const canvasId = `ug-tree-canvas-${safeId}-${Date.now()}`

  popup = new mapboxgl.Popup({
    closeButton: true,
    maxWidth: '560px',
    anchor: 'bottom',
    offset: [0, 0],
  })
    .setLngLat(lngLat)
    .setHTML(treePopupHtml(feature, canvasId))
    .addTo(map)

  popup.on('close', onTreePopupClose)

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!popup || !map) return
      const canvas = document.getElementById(canvasId)
      if (!canvas) return
      try {
        disposePopupPreview = mountPopupTreePreview(canvas, feature)
      } catch (e) {
        console.warn('Tree preview WebGL:', e)
      }
    })
  })
}

function wireTreeClicks() {
  map.on('click', TREES_HIT_LAYER_ID, (e) => {
    const f = e.features?.[0]
    if (!f?.properties?.assetId) return
    store.selectTree(f.properties.assetId)
    showPopup(e.lngLat, f)
  })
  map.on('mouseenter', TREES_HIT_LAYER_ID, () => {
    map.getCanvas().style.cursor = 'pointer'
  })
  map.on('mouseleave', TREES_HIT_LAYER_ID, () => {
    map.getCanvas().style.cursor = ''
  })
}

function applyMapMode(mode) {
  if (!map || !map.isStyleLoaded()) return
  if (mode === '3d') {
    map.easeTo({ pitch: 58, bearing: -18, duration: 700 })
    setBuildingLayerVisibility(map, true)
    setTreeCircleVisibility(map, { fillVisible: false, hitVisible: true })
    if (!map.getLayer(TREES_MESH_LAYER_ID)) {
      addTreesMeshLayer(map, () => store.treeCollection.features)
    }
  } else {
    map.easeTo({ pitch: 0, bearing: 0, duration: 700 })
    setBuildingLayerVisibility(map, false)
    setTreeCircleVisibility(map, { fillVisible: true, hitVisible: true })
    removeTreesMeshLayer(map)
  }
}

onMounted(() => {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
  if (!token) {
    mapError.value = 'Vui lòng đặt VITE_MAPBOX_ACCESS_TOKEN trong tệp .env để tải bản đồ.'
    return
  }

  mapboxgl.accessToken = token

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [(CORRIDOR_START.lng + CORRIDOR_END.lng) / 2, (CORRIDOR_START.lat + CORRIDOR_END.lat) / 2],
    zoom: 17,
    pitch: 0,
    bearing: 0,
    antialias: true,
  })

  map.addControl(new mapboxgl.NavigationControl(), 'top-right')

  map.on('load', () => {
    const bounds = new mapboxgl.LngLatBounds()
    bounds.extend([CORRIDOR_START.lng, CORRIDOR_START.lat])
    bounds.extend([CORRIDOR_END.lng, CORRIDOR_END.lat])
    map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 80, right: 80 }, maxZoom: 18 })

    addBuildingExtrusionLayer(map)
    setBuildingLayerVisibility(map, false)
    addTreeLayers2d(map, MOCK_TREE_COLLECTION)
    wireTreeClicks()
    syncBounds()
    applyMapMode(store.mapMode)

    store.registerMapResize(() => {
      if (map) map.resize()
    })
  })

  map.on('moveend', syncBounds)
  map.on('zoomend', syncBounds)
})

watch(
  () => store.mapMode,
  (m) => {
    if (map?.loaded()) applyMapMode(m)
  },
)

onBeforeUnmount(() => {
  store.unregisterMapResize()
  if (disposePopupPreview) {
    disposePopupPreview()
    disposePopupPreview = null
  }
  if (popup) {
    popup.off('close', onTreePopupClose)
    popup.remove()
  }
  map?.remove()
  map = null
})
</script>

<template>
  <div ref="mapContainer" class="map-wrap">
    <div v-if="mapError" class="map-fallback">{{ mapError }}</div>
  </div>
</template>

<style scoped>
.map-wrap {
  width: 100%;
  height: 100%;
  min-height: 280px;
  position: relative;
}

.map-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
  background: #e2e8f0;
  color: var(--color-primary);
  font-weight: 600;
  z-index: 2;
}
</style>

<style>
/*
 * Avoid position/width tricks on .mapboxgl-popup — Mapbox positions via transform;
 * extra positioning or fit/max-content widths can throw off anchor math.
 */
.mapboxgl-popup .mapboxgl-popup-content {
  position: relative;
  box-sizing: border-box;
  width: auto;
  max-width: min(560px, calc(100vw - 24px));
  background: transparent !important;
  border: none;
  box-shadow: none;
  padding: 0;
  border-radius: 0;
  overflow: visible;
}

/* Close control sits over the card (sibling of .mapboxgl-popup-content) */
.mapboxgl-popup .mapboxgl-popup-close-button {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 20;
  margin: 0;
  font-size: 1.75rem;
  line-height: 1;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: rgba(255, 255, 255, 0.95);
  background: transparent;
  border-radius: 0;
  border: none;
  cursor: pointer;
}

.mapboxgl-popup .mapboxgl-popup-close-button:hover {
  background-color: transparent;
}

.mapboxgl-popup-content .ug-popup {
  position: relative;
  z-index: 1;
  font-family: var(--font-stack, sans-serif);
  font-size: 1rem;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  border: 2px solid var(--color-primary, rgb(20, 80, 140));
  box-shadow: 0 4px 18px rgba(20, 80, 140, 0.12);
  overflow: hidden;
}

.mapboxgl-popup-content .ug-popup-split {
  display: flex;
  flex-direction: row;
  gap: 0;
  align-items: stretch;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.mapboxgl-popup-content .ug-popup-preview {
  position: relative;
  flex: 0 0 clamp(140px, 22vw, 240px);
  width: clamp(140px, 22vw, 240px);
  align-self: stretch;
  min-height: 0;
  background: transparent;
}

.mapboxgl-popup-content .ug-popup-preview-canvas,
.mapboxgl-popup-content .ug-popup-preview canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 0;
  background: transparent;
}

.mapboxgl-popup-content .ug-popup-info {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Match side-panel section: .overlay-card > h3 */
.mapboxgl-popup-content .ug-popup-section-title {
  margin: 0;
  padding: 0.5rem 2.75rem 0.5rem 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  background: rgba(13, 40, 71, 0.9);
  border-radius: 0;
  text-align: center;
  line-height: 1.25;
  min-width: 215px;
}

/* Match .overlay-card-content */
.mapboxgl-popup-content .ug-popup-section-body {
  padding: 0.75rem 0.85rem;
  color: #fff;
  background: rgba(13, 40, 71, 0.7);
  border-radius: 0 0 8px 8px;
}

.mapboxgl-popup-content .ug-popup-id {
  font-weight: 600;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 1);
  text-align: center;
  margin: 0 0 0.5rem;
}
.mapboxgl-popup-content .ug-popup-coord {
  color: #64748b;
  margin-bottom: 0.35rem;
}
.mapboxgl-popup-content .ug-popup-meta {
  color: rgba(255, 255, 255, 1);
  margin: 0.2rem 0;
}
.mapboxgl-popup-content .ug-popup-meta strong {
  color: #fff;
  font-weight: 600;
}
.mapboxgl-popup-content .ug-popup-height {
  color: rgba(255, 255, 255, 0.88);
  margin: 0.2rem 0 0;
}

@media (max-width: 440px) {
  .mapboxgl-popup-content .ug-popup-split {
    flex-direction: column;
  }
  .mapboxgl-popup-content .ug-popup-preview {
    flex: 0 0 auto;
    width: 100%;
    min-height: 200px;
    max-height: min(42vh, 280px);
  }
}
</style>
