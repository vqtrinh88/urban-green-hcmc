import * as THREE from 'three'

/**
 * @param {Record<string, unknown>} props GeoJSON feature.properties
 */
function buildPreviewTreeGroup(props) {
  const h = Math.max(0.25, Number(props.heightM) || 3.5)
  const canopyR = Math.max(0.15, Number(props.canopyDiameterM) || 2) * 0.45
  const trunkH = h * 0.38
  const trunkR = Math.max(0.06, trunkH * 0.14)
  const bark = new THREE.MeshLambertMaterial({ color: 0x5c4033 })
  const leaf = new THREE.MeshLambertMaterial({ color: 0x3d8b55 })

  const group = new THREE.Group()

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(trunkR * 0.85, trunkR, trunkH, 14, 1),
    bark,
  )
  trunk.position.y = trunkH / 2
  group.add(trunk)

  const branchLen = trunkH * 0.52
  const branchR = trunkR * 0.38
  const branchMat = new THREE.MeshLambertMaterial({ color: 0x4a3528 })
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.25
    const elev = 0.38 + (i % 3) * 0.11
    const br = new THREE.Mesh(new THREE.CylinderGeometry(branchR * 0.35, branchR * 0.5, branchLen, 7, 1), branchMat)
    br.rotation.z = Math.PI / 2 - 0.4
    br.position.set(Math.cos(a) * trunkR * 0.55, trunkH * elev, Math.sin(a) * trunkR * 0.55)
    br.rotation.y = -a
    group.add(br)
  }

  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(canopyR, 1), leaf)
  crown.position.y = trunkH + canopyR * 0.78
  group.add(crown)

  return group
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {GeoJSON.Feature} feature
 * @returns {() => void} dispose
 */
export function mountPopupTreePreview(canvas, feature) {
  const props = feature.properties ?? {}
  const parent = canvas.parentElement

  function measure() {
    const box = parent?.getBoundingClientRect?.() ?? canvas.getBoundingClientRect()
    const w = Math.max(1, Math.floor(box.width))
    const h = Math.max(1, Math.floor(box.height))
    return { w, h }
  }

  let { w, h } = measure()
  if (w < 4 || h < 4) {
    w = canvas.clientWidth || 180
    h = canvas.clientHeight || 220
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h, false)
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  scene.add(new THREE.AmbientLight(0xffffff, 0.65))
  const key = new THREE.DirectionalLight(0xffffff, 0.95)
  key.position.set(2.2, 4.2, 3.2)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xc5d4f0, 0.38)
  fill.position.set(-2.2, 1.2, -2)
  scene.add(fill)

  const tree = buildPreviewTreeGroup(props)
  scene.add(tree)

  const camera = new THREE.PerspectiveCamera(36, w / h, 0.08, 50)
  camera.position.set(2.15, 1.32, 2.4)
  camera.lookAt(0, 0.52, 0)

  const clock = new THREE.Clock()
  let raf = 0
  let alive = true

  function resizeToParent() {
    const { w: nw, h: nh } = measure()
    if (nw < 2 || nh < 2) return
    camera.aspect = nw / nh
    camera.updateProjectionMatrix()
    renderer.setSize(nw, nh, false)
  }

  const ro =
    typeof ResizeObserver !== 'undefined' && parent
      ? new ResizeObserver(() => {
          if (!alive) return
          resizeToParent()
        })
      : null
  ro?.observe(parent)

  requestAnimationFrame(() => {
    if (alive) resizeToParent()
  })

  function tick() {
    if (!alive) return
    const dt = clock.getDelta()
    tree.rotation.y += dt * 0.9
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  function disposeMesh(obj) {
    obj.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose()
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose())
        else o.material?.dispose()
      }
    })
  }

  return () => {
    alive = false
    ro?.disconnect()
    cancelAnimationFrame(raf)
    disposeMesh(tree)
    scene.remove(tree)
    renderer.dispose()
  }
}
