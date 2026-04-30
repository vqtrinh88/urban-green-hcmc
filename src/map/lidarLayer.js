import * as THREE from 'three'
import mapboxgl from 'mapbox-gl'
import { CORRIDOR_START, CORRIDOR_END } from '@/utils/mockTrees.js'

export const LIDAR_LAYER_ID = 'lidar-point-cloud'
const BG_LAYER_ID = 'lidar-dark-bg'

// ---------------------------------------------------------------------------
// Seeded PRNG — deterministic geometry across renders
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Scene coordinate system
//   X = east  (metres from corridor centre)
//   Y = altitude (metres)
//   Z = south (metres from corridor centre)
//
// render() applies a local transform that maps this to Mapbox Mercator world
// space, exactly as the reference implementation does.
// ---------------------------------------------------------------------------
function makeSceneParams() {
  const centerLng = (CORRIDOR_START.lng + CORRIDOR_END.lng) / 2
  const centerLat = (CORRIDOR_START.lat + CORRIDOR_END.lat) / 2
  const φ = (centerLat * Math.PI) / 180
  const mPerLat = 110574
  const mPerLng = 110574 * Math.cos(φ)

  /** lng/lat → scene metres */
  function toScene(lng, lat) {
    return {
      sx: (lng - centerLng) * mPerLng,
      sz: (centerLat - lat) * mPerLat, // south-positive
    }
  }

  const start = toScene(CORRIDOR_START.lng, CORRIDOR_START.lat)
  const end = toScene(CORRIDOR_END.lng, CORRIDOR_END.lat)
  const cdx = end.sx - start.sx
  const cdz = end.sz - start.sz
  const corridorLen = Math.sqrt(cdx * cdx + cdz * cdz)

  // Unit perpendicular to corridor in the XZ plane (90° CCW)
  const perpX = -cdz / corridorLen
  const perpZ = cdx / corridorLen

  return { centerLng, centerLat, start, end, cdx, cdz, corridorLen, perpX, perpZ, toScene }
}

// ---------------------------------------------------------------------------
// Point cloud generators
// ---------------------------------------------------------------------------

function buildTreePoints(features, sp) {
  const rng = mulberry32(0xabcd1234)
  const pos = []
  const col = []

  for (const f of features) {
    const p = f.properties
    const [lng, lat] = f.geometry.coordinates
    const { sx, sz } = sp.toScene(lng, lat)

    const heightM = Number(p.heightM) || 4
    const canopyR = (Number(p.canopyDiameterM) || 3) / 2
    const trunkH = heightM * 0.38
    const cy = trunkH + canopyR * 0.65 // canopy sphere centre Y

    // Trunk — cylinder scatter
    for (let i = 0; i < 80; i++) {
      const a = rng() * Math.PI * 2
      const r = rng() * 0.12
      const y = rng() * trunkH
      pos.push(sx + Math.cos(a) * r, y, sz + Math.sin(a) * r)
      const b = 0.4 + rng() * 0.4
      col.push(b * 0.9, b * 0.45, b * 0.08)
    }

    // Canopy shell — Fibonacci sphere (even distribution, matches real LiDAR returns)
    const N = 520
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / N)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i
      const shellR = (0.68 + rng() * 0.32) * canopyR
      const px = Math.sin(phi) * Math.cos(theta) * shellR
      const py = Math.sin(phi) * Math.sin(theta) * shellR * 0.75 // slightly oblate
      const pz = Math.cos(phi) * shellR
      // LiDAR rarely returns below canopy centre
      if (py < -canopyR * 0.45 && rng() < 0.72) continue
      pos.push(sx + px, cy + py, sz + pz)
      const hr = (py + canopyR) / (canopyR * 2)
      const bright = 0.52 + hr * 0.48
      col.push(0, bright * (0.78 + rng() * 0.22), bright)
    }

    // Interior scatter — penetrating pulses
    for (let i = 0; i < 70; i++) {
      const px = (rng() * 2 - 1) * canopyR * 0.55
      const py = (rng() * 2 - 1) * canopyR * 0.45
      const pz = (rng() * 2 - 1) * canopyR * 0.55
      pos.push(sx + px, cy + py, sz + pz)
      const b = 0.28 + rng() * 0.28
      col.push(0, b * 0.85, b)
    }
  }

  return { positions: new Float32Array(pos), colors: new Float32Array(col) }
}

function buildGroundPoints(sp) {
  const rng = mulberry32(0xf00dbeef)
  const TOTAL_PTS = 7000
  const pos = []
  const col = []

  for (let i = 0; i < TOTAL_PTS; i++) {
    const t = rng()
    const px = sp.start.sx + t * sp.cdx
    const pz = sp.start.sz + t * sp.cdz

    // Lateral zone — both sides of corridor
    const side = rng() < 0.5 ? 1 : -1
    const zone = rng()
    let lateralM, r, g, b

    if (zone < 0.4) {
      lateralM = rng() * 3.5 // road
      const br = 0.08 + rng() * 0.12
      r = 0; g = br * 0.35; b = br
    } else if (zone < 0.65) {
      lateralM = 3.5 + rng() * 2 // sidewalk
      const br = 0.45 + rng() * 0.3
      r = br * 0.85; g = br * 0.85; b = br * 0.4
    } else {
      lateralM = 5.5 + rng() * 4.5 // verge
      const br = 0.55 + rng() * 0.38
      r = br; g = br * 0.32; b = 0
    }

    lateralM *= side
    pos.push(
      px + lateralM * sp.perpX,
      0.03 + rng() * 0.05,
      pz + lateralM * sp.perpZ,
    )
    col.push(r, g, b)
  }

  return { positions: new Float32Array(pos), colors: new Float32Array(col) }
}

function buildBuildingPoints(sp) {
  const rng = mulberry32(0xdeadcafe)
  const TOTAL_PTS = 2800
  const pos = []
  const col = []

  for (let i = 0; i < TOTAL_PTS; i++) {
    const t = rng()
    const px = sp.start.sx + t * sp.cdx
    const pz = sp.start.sz + t * sp.cdz

    const side = rng() < 0.5 ? 1 : -1
    const lateralM = (12 + rng() * 10) * side
    const heightM = 3 + rng() * 15

    pos.push(
      px + lateralM * sp.perpX,
      heightM,
      pz + lateralM * sp.perpZ,
    )
    const v = 0.22 + (heightM / 18) * 0.38
    col.push(v, v, v)
  }

  return { positions: new Float32Array(pos), colors: new Float32Array(col) }
}

/** Merge multiple { positions, colors } chunks into one BufferGeometry. */
function mergeToGeometry(chunks) {
  let totalPts = 0
  for (const c of chunks) totalPts += c.positions.length / 3

  const positions = new Float32Array(totalPts * 3)
  const colors = new Float32Array(totalPts * 3)
  let offset = 0
  for (const c of chunks) {
    positions.set(c.positions, offset * 3)
    colors.set(c.colors, offset * 3)
    offset += c.positions.length / 3
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

/** Violet wireframe bounding box for one tree, in scene metres. */
function buildTreeBox(f, sp) {
  const p = f.properties
  const [lng, lat] = f.geometry.coordinates
  const { sx, sz } = sp.toScene(lng, lat)

  const heightM = Number(p.heightM) || 4
  const canopyDiam = Number(p.canopyDiameterM) || 3

  const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(canopyDiam, heightM, canopyDiam))
  const mat = new THREE.LineBasicMaterial({ color: 0x8b00ff, transparent: true, opacity: 0.75 })
  const box = new THREE.LineSegments(geo, mat)
  // Centre of box sits at half height; base at y=0
  box.position.set(sx, heightM / 2, sz)
  return box
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create the Mapbox CustomLayerInterface for LiDAR mode.
 * @param {GeoJSON.FeatureCollection} treeCollection
 */
export function createLidarLayer(treeCollection) {
  /** @type {THREE.WebGLRenderer} */ let renderer
  /** @type {THREE.Scene} */ let scene
  /** @type {THREE.Camera} */ let camera
  /** @type {THREE.Points} */ let pointsMesh
  /** @type {THREE.LineSegments[]} */ let boxes = []

  const features = treeCollection.features

  return {
    id: LIDAR_LAYER_ID,
    type: 'custom',
    renderingMode: '3d',

    onAdd(map, gl) {
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      })
      renderer.autoClear = false

      scene = new THREE.Scene()
      camera = new THREE.Camera()

      const sp = makeSceneParams()

      const chunks = [
        buildGroundPoints(sp),
        buildBuildingPoints(sp),
        buildTreePoints(features, sp),
      ]
      const geo = mergeToGeometry(chunks)
      const mat = new THREE.PointsMaterial({
        size: 0.14,
        sizeAttenuation: true,
        vertexColors: true,
      })
      pointsMesh = new THREE.Points(geo, mat)
      scene.add(pointsMesh)

      boxes = features.map((f) => buildTreeBox(f, sp))
      for (const b of boxes) scene.add(b)
    },

    render(gl, matrix) {
      // Local transform: translate to corridor centre in Mercator space,
      // scale metres → Mercator units (Y inverted: Mercator Y increases south),
      // rotate π/2 around X so Three.js Y-up maps to Mapbox altitude axis.
      const centerLng = (CORRIDOR_START.lng + CORRIDOR_END.lng) / 2
      const centerLat = (CORRIDOR_START.lat + CORRIDOR_END.lat) / 2
      const mc = mapboxgl.MercatorCoordinate.fromLngLat([centerLng, centerLat], 0)
      const scale = mc.meterInMercatorCoordinateUnits()

      const rotX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        Math.PI / 2,
      )

      const l = new THREE.Matrix4()
        .makeTranslation(mc.x, mc.y, mc.z)
        .scale(new THREE.Vector3(scale, -scale, scale))
        .multiply(rotX)

      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(l)

      renderer.resetState()
      renderer.render(scene, camera)
      map.triggerRepaint()
    },

    onRemove() {
      pointsMesh?.geometry.dispose()
      pointsMesh?.material.dispose()
      for (const b of boxes) {
        b.geometry.dispose()
        b.material.dispose()
      }
      boxes = []
      renderer?.dispose()
    },
  }
}

/** Add a near-black background layer to darken the base map tiles. */
export function addLidarBackground(map) {
  if (map.getLayer(BG_LAYER_ID)) return
  const firstLayerId = map.getStyle()?.layers?.[0]?.id
  const def = {
    id: BG_LAYER_ID,
    type: 'background',
    paint: { 'background-color': '#060a14', 'background-opacity': 0.94 },
  }
  try {
    if (firstLayerId) map.addLayer(def, firstLayerId)
    else map.addLayer(def)
  } catch {
    // ignore duplicate
  }
}

/** Remove the LiDAR background layer. */
export function removeLidarBackground(map) {
  if (map.getLayer(BG_LAYER_ID)) map.removeLayer(BG_LAYER_ID)
}

/** Remove the LiDAR point cloud layer. */
export function removeLidarLayer(map) {
  if (map.getLayer(LIDAR_LAYER_ID)) map.removeLayer(LIDAR_LAYER_ID)
}
