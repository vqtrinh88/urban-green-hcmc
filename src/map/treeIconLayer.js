import { TREES_LAYER_ID, TREES_SOURCE_ID } from '@/map/treeLayer2d.js'

/** @type {string} */
export const TREE_ICON_IMAGE_ID = 'ug-tree-marker-icon'
export const TREES_ICON_LAYER_ID = 'urban-trees-icon'

/**
 * @param {import('mapbox-gl').Map} map
 * @param {string} imageUrl - resolved asset URL (e.g. Vite ?url import)
 * @param {(err: Error | null) => void} [callback]
 */
export function loadTreeMarkerImage(map, imageUrl, callback) {
  map.loadImage(imageUrl, (err, image) => {
    if (err || !image) {
      console.warn('Tree marker icon:', err)
      callback?.()
      return
    }
    if (!map.hasImage(TREE_ICON_IMAGE_ID)) {
      map.addImage(TREE_ICON_IMAGE_ID, image, { sdf: false })
    }
    callback?.()
  })
}

/**
 * Symbol layer using the tree PNG; inserted below circle fill, above hit layer (hit stays for picking).
 * @param {import('mapbox-gl').Map} map
 */
export function addTreeIconLayer(map) {
  if (map.getLayer(TREES_ICON_LAYER_ID) || !map.hasImage(TREE_ICON_IMAGE_ID)) return

  map.addLayer(
    {
      id: TREES_ICON_LAYER_ID,
      type: 'symbol',
      source: TREES_SOURCE_ID,
      layout: {
        'icon-image': TREE_ICON_IMAGE_ID,
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          14,
          0.28,
          16,
          0.38,
          18,
          0.48,
        ],
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        visibility: 'none',
      },
    },
    TREES_LAYER_ID,
  )
}

/**
 * @param {import('mapbox-gl').Map} map
 * @param {boolean} visible
 */
export function setTreeIconLayerVisibility(map, visible) {
  if (!map.getLayer(TREES_ICON_LAYER_ID)) return
  map.setLayoutProperty(TREES_ICON_LAYER_ID, 'visibility', visible ? 'visible' : 'none')
}
