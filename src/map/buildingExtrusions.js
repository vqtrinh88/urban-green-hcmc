/**
 * Insert 3D building extrusions (Mapbox composite / building).
 * @param {import('mapbox-gl').Map} map
 * @param {string} [beforeId] - layer id to insert before (e.g. first symbol)
 */
export function addBuildingExtrusionLayer(map, beforeId) {
  const style = map.getStyle()
  if (!style?.layers) return

  let symbolLayerId
  for (const layer of style.layers) {
    if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
      symbolLayerId = layer.id
      break
    }
  }

  const anchor = beforeId ?? symbolLayerId

  if (map.getLayer('urban-3d-buildings')) return

  const layerDef = {
    id: 'urban-3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', ['get', 'extrude'], 'true'],
    type: 'fill-extrusion',
    minzoom: 14,
    paint: {
      'fill-extrusion-color': 'rgb(180, 188, 200)',
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        14,
        0,
        14.05,
        ['coalesce', ['get', 'height'], 12],
      ],
      'fill-extrusion-base': [
        'interpolate',
        ['linear'],
        ['zoom'],
        14,
        0,
        14.05,
        ['coalesce', ['get', 'min_height'], 0],
      ],
      'fill-extrusion-opacity': 0.72,
    },
  }

  try {
    if (anchor) map.addLayer(layerDef, anchor)
    else map.addLayer(layerDef)
  } catch {
    try {
      map.addLayer({
        ...layerDef,
        filter: ['has', 'height'],
      })
    } catch {
      console.warn('Could not add building extrusion layer')
    }
  }
}

export function setBuildingLayerVisibility(map, visible) {
  if (!map.getLayer('urban-3d-buildings')) return
  map.setLayoutProperty('urban-3d-buildings', 'visibility', visible ? 'visible' : 'none')
}
