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
    <div class="ug-popup ug-popup-split">
      <div class="ug-popup-preview" aria-hidden="true">
        <canvas id="${canvasId}" width="180" height="220"></canvas>
      </div>
      <div class="ug-popup-info">
        <div class="ug-popup-id">${esc(p.assetId)}</div>
        <div class="ug-popup-coord">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
        <div class="ug-popup-species">${esc(p.commonName)} / <i>${esc(p.scientificName)}</i></div>
        <div class="ug-popup-meta">Sức khỏe tán: <strong>${esc(healthVi(p.health))}</strong></div>
        <div class="ug-popup-meta">Nguy cơ: <strong>${esc(riskVi(p.riskRating))}</strong></div>
        <div class="ug-popup-height">Cao ${Number(p.heightM).toFixed(2)} m</div>
        <div class="ug-popup-height">Đường kính tán ${Number(p.canopyDiameterM).toFixed(2)} m</div>
      </div>
    </div>
  `
}

function showPopup(lngLat, feature) {
  if (disposePopupPreview) {
    disposePopupPreview()
    disposePopupPreview = null
  }
  if (popup) popup.remove()

  const safeId = String(feature.properties?.assetId ?? 'tree').replace(/[^a-zA-Z0-9_-]/g, '_')
  const canvasId = `ug-tree-canvas-${safeId}-${Date.now()}`

  popup = new mapboxgl.Popup({ closeButton: true, maxWidth: '520px' })
    .setLngLat(lngLat)
    .setHTML(treePopupHtml(feature, canvasId))
    .addTo(map)

  popup.on('close', () => {
    if (disposePopupPreview) {
      disposePopupPreview()
      disposePopupPreview = null
    }
  })

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
  if (popup) popup.remove()
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
.mapboxgl-popup .mapboxgl-popup-content {
  border-radius: 12px;
  border: 2px solid var(--color-primary, rgb(20, 80, 140));
  box-shadow: 0 4px 18px rgba(20, 80, 140, 0.12);
  padding: 14px 2.75rem 12px 14px;
  overflow: hidden;
}

.mapboxgl-popup .mapboxgl-popup-close-button {
  font-size: 1.75rem;
  line-height: 1;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--color-primary, rgb(20, 80, 140));
}

.mapboxgl-popup .mapboxgl-popup-close-button:hover {
  background-color: rgba(20, 80, 140, 0.08);
}

.mapboxgl-popup-content .ug-popup {
  font-family: var(--font-stack, sans-serif);
  font-size: 1rem;
}

.mapboxgl-popup-content .ug-popup-split {
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: stretch;
  min-width: 0;
}

.mapboxgl-popup-content .ug-popup-preview {
  flex: 0 0 180px;
  align-self: center;
}

.mapboxgl-popup-content .ug-popup-preview canvas {
  display: block;
  width: 180px;
  height: 220px;
  border-radius: 10px;
  background: linear-gradient(165deg, #e8f4fc 0%, #dbeafe 55%, #cfe8f8 100%);
}

.mapboxgl-popup-content .ug-popup-info {
  flex: 1;
  min-width: 0;
}

.mapboxgl-popup-content .ug-popup-id {
  font-weight: 700;
  color: var(--color-primary, rgb(20, 80, 140));
}
.mapboxgl-popup-content .ug-popup-coord {
  color: #64748b;
  margin-bottom: 0.35rem;
}
.mapboxgl-popup-content .ug-popup-species {
  margin: 0.2rem 0 1rem 0;
  line-height: 1.35;
  color: #1e293b;
}
.mapboxgl-popup-content .ug-popup-meta {
  color: #475569;
  margin-bottom: 0.25rem;
}
.mapboxgl-popup-content .ug-popup-height {
  margin-top: 0.15rem;
  color: #334155;
}

@media (max-width: 440px) {
  .mapboxgl-popup-content .ug-popup-split {
    flex-direction: column;
  }
  .mapboxgl-popup-content .ug-popup-preview {
    flex: none;
    width: 100%;
    align-self: center;
  }
}
</style>
