import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MOCK_TREE_COLLECTION } from '@/utils/mockTrees.js'
import {
  aggregateTreesInBounds,
  filterFeaturesByBounds,
  priorityTrees,
  hasWindRiskInventory,
} from '@/utils/aggregateByBounds.js'

/** Mapbox map.resize — registered by MapPanel when the map is ready. */
let mapResizeCallback = null

export const useDashboardStore = defineStore('dashboard', () => {
  const mapBounds = ref(null)
  /** @type {import('vue').Ref<'2d'|'3d'>} */
  const mapMode = ref('2d')
  const selectedTreeId = ref(null)
  const windSpeedMs = ref(0)

  const treeCollection = MOCK_TREE_COLLECTION

  const treesInBounds = computed(() =>
    filterFeaturesByBounds(treeCollection, mapBounds.value),
  )

  const aggregates = computed(() =>
    aggregateTreesInBounds(treeCollection, mapBounds.value),
  )

  const priorityList = computed(() => priorityTrees(treeCollection))

  const selectedFeature = computed(() => {
    if (!selectedTreeId.value) return null
    return (
      treeCollection.features.find((f) => f.properties.assetId === selectedTreeId.value) ?? null
    )
  })

  const showWindBanner = computed(() =>
    hasWindRiskInventory(treesInBounds.value, { windSpeedMs: windSpeedMs.value }),
  )

  function setMapBounds(bounds) {
    mapBounds.value = bounds
  }

  function setMapMode(mode) {
    mapMode.value = mode
  }

  function selectTree(assetId) {
    selectedTreeId.value = assetId
  }

  function clearSelection() {
    selectedTreeId.value = null
  }

  function setWindSpeed(ms) {
    windSpeedMs.value = ms
  }

  function registerMapResize(fn) {
    mapResizeCallback = fn
  }

  function unregisterMapResize() {
    mapResizeCallback = null
  }

  /** Call after layout changes (e.g. panel collapse) so the map fills the map stage. */
  function requestMapResize() {
    mapResizeCallback?.()
  }

  return {
    mapBounds,
    mapMode,
    selectedTreeId,
    windSpeedMs,
    treeCollection,
    treesInBounds,
    aggregates,
    priorityList,
    selectedFeature,
    showWindBanner,
    setMapBounds,
    setMapMode,
    selectTree,
    clearSelection,
    setWindSpeed,
    registerMapResize,
    unregisterMapResize,
    requestMapResize,
  }
})
