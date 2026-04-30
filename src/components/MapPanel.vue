<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useDashboardStore } from '@/stores/dashboard.js'
import {
  MOCK_TREE_COLLECTION,
  CORRIDOR_START,
  CORRIDOR_END,
  corridorTrackBearingRad,
  offsetMetres,
} from '@/utils/mockTrees.js'
import { addTreeLayers2d, setTreeCircleVisibility, TREES_HIT_LAYER_ID } from '@/map/treeLayer2d.js'
import { addBuildingExtrusionLayer, setBuildingLayerVisibility } from '@/map/buildingExtrusions.js'
import {
  addTreeIconLayer,
  loadTreeMarkerImage,
  setTreeIconLayerVisibility,
} from '@/map/treeIconLayer.js'
import {
  createLidarLayer,
  addLidarBackground,
  removeLidarBackground,
  removeLidarLayer,
  LIDAR_LAYER_ID,
} from '@/map/lidarLayer.js'
import { mountPopupTreePreview } from '@/map/popupTreePreview.js'
import treeIconUrl from '@/assets/tree.png?url'
import { healthVi, riskVi } from '@/utils/viLabels.js'

const mapContainer = ref(null)
const mapError = ref('')
const store = useDashboardStore()

const LIDAR_ZOOM = 19
const POPUP_ZOOM = 20

// Corridor bearing — constant for this dataset, computed once.
const _corridorTrack = corridorTrackBearingRad()

let map
/** @type {mapboxgl.Popup | null} */
let popup = null
/** @type {null | (() => void)} */
let disposePopupPreview = null
let lidarActive = false
/** @type {mapboxgl.Popup[]} */
let lidarPopups = []

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
  if (!map) return
  // Do not gate on map.isStyleLoaded(): Mapbox GL v3 can report false during/just after
  // the `load` event, which would skip 3D setup and leave buildings hidden.
  if (mode === '3d') {
    map.easeTo({ pitch: 58, bearing: -18, duration: 700 })
    setBuildingLayerVisibility(map, true)
    setTreeCircleVisibility(map, { fillVisible: false, hitVisible: true })
    setTreeIconLayerVisibility(map, true)
  } else {
    map.easeTo({ pitch: 0, bearing: 0, duration: 700 })
    setBuildingLayerVisibility(map, false)
    setTreeCircleVisibility(map, { fillVisible: true, hitVisible: true })
    setTreeIconLayerVisibility(map, false)
  }
}

/** Compact popup HTML for LiDAR labels — same structure as treePopupHtml but with an info button. */
function lidarPopupHtml(feature) {
  const p = feature.properties
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    const safeId = esc(p.assetId)
  return `
    <div class="ug-popup ug-popup-split" style="font-size:0.8rem;">
      <div class="ug-popup-info">
        <div class="ug-popup-section-title">
          ${safeId}
          <button class="ug-lidar-info-btn" onclick="window.__ugLidarSelect('${safeId}')" title="Xem hồ sơ cây">i</button>
        </div>
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

/** Flat-earth distance in metres between two lng/lat points. */
function metersBetween(lng1, lat1, lng2, lat2) {
  const φ = (lat1 * Math.PI) / 180
  const dx = (lng2 - lng1) * Math.cos(φ) * 111320
  const dy = (lat2 - lat1) * 111320
  return Math.sqrt(dx * dx + dy * dy)
}

const LIDAR_LABEL_MAX = 6

function showLidarLabels() {
  if (!map) return
  const { lng, lat } = map.getCenter()

  const sorted = [...MOCK_TREE_COLLECTION.features].sort((a, b) => {
    const [aLng, aLat] = a.geometry.coordinates
    const [bLng, bLat] = b.geometry.coordinates
    return metersBetween(aLng, aLat, lng, lat) - metersBetween(bLng, bLat, lng, lat)
  })

  for (const f of sorted.slice(0, LIDAR_LABEL_MAX)) {
    const [fLng, fLat] = f.geometry.coordinates
    const side = f.properties.corridorSide        // 'L' or 'R'
    const canopyR = (Number(f.properties.canopyDiameterM) || 3) / 2

    // Project tree centre to screen space.
    const centerPx = map.project([fLng, fLat])

    // Compute the world-space position of the bounding-box's outer edge
    // (canopy radius + small gap) then project it to get the screen X offset.
    const perpBearing = side === 'L' ? _corridorTrack - Math.PI / 2 : _corridorTrack + Math.PI / 2
    const { lat: eLat, lng: eLng } = offsetMetres(fLat, fLng, perpBearing, canopyR + 3)
    const edgePx = map.project([eLng, eLat])

    // xOffset: negative = left, positive = right
    const xOffset = edgePx.x - centerPx.x
    // anchor: 'right' → popup body extends left; 'left' → extends right
    const anchor = side === 'L' ? 'right' : 'left'

    const p = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      anchor,
      offset: [xOffset, 0],
      maxWidth: '200px',
      className: 'ug-lidar-popup',
    })
      .setLngLat([fLng, fLat])
      .setHTML(lidarPopupHtml(f))
      .addTo(map)
    lidarPopups.push(p)
  }
}

function clearLidarLabels() {
  for (const p of lidarPopups) p.remove()
  lidarPopups = []
}

function onLidarMoveEnd() {
  clearLidarLabels()
  if (map && map.getZoom() > POPUP_ZOOM) showLidarLabels()
}

function enterLidarMode() {
  if (!map || lidarActive) return
  lidarActive = true
  addLidarBackground(map)
  setTreeCircleVisibility(map, { fillVisible: false, hitVisible: true })
  setTreeIconLayerVisibility(map, false)
  setBuildingLayerVisibility(map, false)
  if (!map.getLayer(LIDAR_LAYER_ID)) {
    map.addLayer(createLidarLayer(MOCK_TREE_COLLECTION))
  }
  map.on('moveend', onLidarMoveEnd)
}

function exitLidarMode() {
  if (!map || !lidarActive) return
  lidarActive = false
  map.off('moveend', onLidarMoveEnd)
  removeLidarLayer(map)
  removeLidarBackground(map)
  clearLidarLabels()
  store.clearSelection()
  applyMapMode(store.mapMode)
}

function onZoomChange() {
  if (!map) return
  const z = map.getZoom()
  if (z >= LIDAR_ZOOM) {
    enterLidarMode()
    // Popups only above POPUP_ZOOM; clear them when zooming back below it
    if (z > POPUP_ZOOM) {
      if (lidarPopups.length === 0) showLidarLabels()
    } else {
      clearLidarLabels()
      store.clearSelection()
    }
  } else {
    exitLidarMode()
  }
}

onMounted(() => {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
  if (!token) {
    mapError.value = 'Vui lòng đặt VITE_MAPBOX_ACCESS_TOKEN trong tệp .env để tải bản đồ.'
    return
  }

  mapboxgl.accessToken = token
  window.__ugLidarSelect = (id) => store.selectTree(id)

  const corridorCenter = [
    (CORRIDOR_START.lng + CORRIDOR_END.lng) / 2,
    (CORRIDOR_START.lat + CORRIDOR_END.lat) / 2,
  ]
  const start3d = store.mapMode === '3d'
  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: corridorCenter,
    zoom: 17,
    pitch: start3d ? 58 : 0,
    bearing: start3d ? -18 : 0,
    antialias: true,
  })

  map.addControl(new mapboxgl.NavigationControl(), 'top-right')

  map.on('load', () => {
    addBuildingExtrusionLayer(map)
    setBuildingLayerVisibility(map, false)
    addTreeLayers2d(map, MOCK_TREE_COLLECTION)

    const finishMapInit = () => {
      wireTreeClicks()
      syncBounds()
      applyMapMode(store.mapMode)

      store.registerMapResize(() => {
        if (map) map.resize()
      })
    }

    loadTreeMarkerImage(map, treeIconUrl, () => {
      addTreeIconLayer(map)
      finishMapInit()
    })
  })

  map.on('moveend', syncBounds)
  map.on('zoomend', syncBounds)
  map.on('zoom', onZoomChange)
})

watch(
  () => store.mapMode,
  (m) => {
    if (map?.loaded()) applyMapMode(m)
  },
)

onBeforeUnmount(() => {
  delete window.__ugLidarSelect
  store.unregisterMapResize()
  if (disposePopupPreview) {
    disposePopupPreview()
    disposePopupPreview = null
  }
  if (popup) {
    popup.off('close', onTreePopupClose)
    popup.remove()
  }
  if (lidarActive && map) {
    map.off('moveend', onLidarMoveEnd)
    removeLidarLayer(map)
    removeLidarBackground(map)
    clearLidarLabels()
    lidarActive = false
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

/* ── Compact overrides for LiDAR mode labels ── */
.ug-lidar-info-btn {
  float: right;
  margin-left: 0.4rem;
  width: 15px;
  height: 15px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 0.62rem;
  font-style: italic;
  font-weight: 700;
  font-family: Georgia, serif;
  cursor: pointer;
  pointer-events: auto;
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.ug-lidar-info-btn:hover {
  background: rgba(255, 255, 255, 0.32);
}

.ug-lidar-popup .mapboxgl-popup-content .ug-popup {
  font-size: 0.65rem;
}
.ug-lidar-popup .mapboxgl-popup-content .ug-popup-section-title {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
}
.ug-lidar-popup .mapboxgl-popup-content .ug-popup-section-body {
  padding: 0.3rem 0.5rem 0.4rem;
}
.ug-lidar-popup .mapboxgl-popup-content .ug-popup-id {
  font-size: 0.68rem;
  margin-bottom: 0.2rem;
}
.ug-lidar-popup .mapboxgl-popup-content .ug-popup-meta,
.ug-lidar-popup .mapboxgl-popup-content .ug-popup-height {
  margin: 0.1rem 0;
}

</style>
