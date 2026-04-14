/** @type {string} */
export const TREES_SOURCE_ID = 'urban-trees'
export const TREES_LAYER_ID = 'urban-trees-circles'
export const TREES_HIT_LAYER_ID = 'urban-trees-hit'

const HEALTH_COLOR = {
  Excellent: '#10b981',
  Good: '#10b981',
  Fair: '#f59e0b',
  Poor: '#ef4444',
  Critical: '#ef4444',
}

/**
 * Small circle markers (~Mapbox POI / default pin visual weight), slightly larger when zoomed in.
 * Hit layer stays a bit bigger for reliable clicks.
 * @param {import('mapbox-gl').Map} map
 * @param {GeoJSON.FeatureCollection} geojson
 */
export function addTreeLayers2d(map, geojson) {
  if (map.getSource(TREES_SOURCE_ID)) {
    map.getSource(TREES_SOURCE_ID).setData(geojson)
    return
  }

  map.addSource(TREES_SOURCE_ID, {
    type: 'geojson',
    data: geojson,
    promoteId: 'assetId',
  })

  map.addLayer({
    id: TREES_HIT_LAYER_ID,
    type: 'circle',
    source: TREES_SOURCE_ID,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 11, 16, 14, 19, 17],
      'circle-color': '#000000',
      'circle-opacity': 0.004,
    },
  })

  map.addLayer({
    id: TREES_LAYER_ID,
    type: 'circle',
    source: TREES_SOURCE_ID,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 3.2, 15, 4, 17, 4.8, 19, 5.6],
      'circle-color': [
        'match',
        ['get', 'health'],
        'Excellent',
        HEALTH_COLOR.Excellent,
        'Good',
        HEALTH_COLOR.Good,
        'Fair',
        HEALTH_COLOR.Fair,
        'Poor',
        HEALTH_COLOR.Poor,
        'Critical',
        HEALTH_COLOR.Critical,
        '#94a3b8',
      ],
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.5)',
    },
  })
}

export function setTreeCircleVisibility(map, { fillVisible, hitVisible }) {
  if (map.getLayer(TREES_LAYER_ID)) {
    map.setPaintProperty(TREES_LAYER_ID, 'circle-opacity', fillVisible ? 1 : 0)
    map.setPaintProperty(TREES_LAYER_ID, 'circle-stroke-opacity', fillVisible ? 1 : 0)
  }
  if (map.getLayer(TREES_HIT_LAYER_ID)) {
    map.setPaintProperty(TREES_HIT_LAYER_ID, 'circle-opacity', hitVisible ? 0.004 : 0)
  }
}

export function healthToMapColor(health) {
  return HEALTH_COLOR[health] ?? '#94a3b8'
}
