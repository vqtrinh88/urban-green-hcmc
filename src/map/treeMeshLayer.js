import * as THREE from 'three'
import mapboxgl from 'mapbox-gl'
import { healthToMapColor } from '@/map/treeLayer2d.js'

const LAYER_ID = 'urban-trees-3d-mesh'

/**
 * Mercator scale for each sphere (meters → same order as former trunk/crown mesh).
 * Too small (e.g. ms×1) is effectively invisible at street zoom.
 */
function sphereRadiusMeters(props) {
  const w = Math.max(0.5, Number(props.canopyDiameterM) || 2)
  const h = Math.max(0.5, Number(props.heightM) || 3.5)
  return Math.max(2.0, w * 0.52, h * 0.36)
}

function healthToThreeColor(health) {
  const hex = healthToMapColor(health).replace('#', '')
  return new THREE.Color(parseInt(hex, 16))
}

/**
 * Mapbox custom layer: instanced spheres (health-colored) at each tree.
 * @param {import('mapbox-gl').Map} map
 * @param {() => GeoJSON.Feature[]} getFeatures
 */
export function createTreesMeshCustomLayer(map, getFeatures) {
  let renderer
  let scene
  let camera
  /** @type {THREE.InstancedMesh | null} */
  let instancedMesh = null
  let maxCount = 0

  const rotX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2)
  const matTr = new THREE.Matrix4()
  const matSc = new THREE.Matrix4()
  const matOut = new THREE.Matrix4()
  const tmpColor = new THREE.Color()

  const layer = {
    id: LAYER_ID,
    type: 'custom',
    renderingMode: '3d',

    onAdd(_m, gl) {
      camera = new THREE.Camera()
      scene = new THREE.Scene()

      scene.add(new THREE.AmbientLight(0xffffff, 0.55))
      const dir = new THREE.DirectionalLight(0xffffff, 0.88)
      dir.position.set(120, 180, 80)
      scene.add(dir)

      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      })
      renderer.autoClear = false
    },

    onRemove() {
      if (instancedMesh) {
        scene.remove(instancedMesh)
        instancedMesh.geometry.dispose()
        instancedMesh.material.dispose()
        instancedMesh = null
      }
      scene = null
      camera = null
      renderer = null
    },

    render(gl, matrix) {
      const features = getFeatures()
      const n = features.length
      if (!renderer || !scene || !camera) return

      if (!instancedMesh || maxCount < n) {
        if (instancedMesh) {
          scene.remove(instancedMesh)
          instancedMesh.geometry.dispose()
          instancedMesh.material.dispose()
        }
        maxCount = Math.max(n, 64)
        const geom = new THREE.SphereGeometry(0.5, 20, 16)
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          toneMapped: false,
          depthTest: true,
          depthWrite: true,
          polygonOffset: true,
          polygonOffsetFactor: -0.5,
          polygonOffsetUnits: -0.5,
        })
        instancedMesh = new THREE.InstancedMesh(geom, mat, maxCount)
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        instancedMesh.frustumCulled = false
        scene.add(instancedMesh)
      }

      for (let i = 0; i < n; i++) {
        const f = features[i]
        const [lng, lat] = f.geometry.coordinates
        const p = f.properties
        const mc = mapboxgl.MercatorCoordinate.fromLngLat([lng, lat], 0)
        const ms = mc.meterInMercatorCoordinateUnits()
        const s = ms * sphereRadiusMeters(p)

        matTr.makeTranslation(mc.x, mc.y, mc.z)
        matSc.makeScale(s, -s, s)
        matOut.copy(matTr).multiply(matSc).multiply(rotX)
        instancedMesh.setMatrixAt(i, matOut)

        tmpColor.copy(healthToThreeColor(p.health))
        instancedMesh.setColorAt(i, tmpColor)
      }

      instancedMesh.count = n
      instancedMesh.instanceMatrix.needsUpdate = true
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true

      const proj = new THREE.Matrix4().fromArray(matrix)
      camera.projectionMatrix.copy(proj)
      camera.projectionMatrixInverse.copy(proj).invert()

      renderer.resetState()
      renderer.render(scene, camera)
    },
  }

  return layer
}

export function addTreesMeshLayer(map, getFeatures) {
  if (map.getLayer(LAYER_ID)) return
  map.addLayer(createTreesMeshCustomLayer(map, getFeatures))
}

export function removeTreesMeshLayer(map) {
  if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
}

export { LAYER_ID as TREES_MESH_LAYER_ID }
