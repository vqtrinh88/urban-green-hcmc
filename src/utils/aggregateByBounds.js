import { PRIORITY_CHIP_VI } from '@/utils/viLabels.js'

export const HEALTH_ORDER = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical']

export const HEALTH_CHART_COLORS = {
  Excellent: 'rgb(16, 185, 129)',
  Good: 'rgb(52, 211, 153)',
  Fair: 'rgb(245, 158, 11)',
  Poor: 'rgb(251, 146, 60)',
  Critical: 'rgb(239, 68, 68)',
}

/**
 * @param {[[number,number],[number,number]]} bounds [[west,south],[east,north]] in lng/lat
 * @param {GeoJSON.FeatureCollection} collection
 */
export function filterFeaturesByBounds(collection, bounds) {
  if (!bounds || !collection?.features) return []
  const [[west, south], [east, north]] = bounds
  return collection.features.filter((f) => {
    const [lng, lat] = f.geometry.coordinates
    return lng >= west && lng <= east && lat >= south && lat <= north
  })
}

export function aggregateTreesInBounds(collection, bounds) {
  const trees = filterFeaturesByBounds(collection, bounds)
  const n = trees.length
  if (n === 0) {
    return {
      count: 0,
      avgHeightM: 0,
      avgDbhCm: 0,
      totalAgbTonnes: 0,
      totalCo2StoredTonnes: 0,
      totalAnnualCo2Tonnes: 0,
      totalAnnualO2Tonnes: 0,
      healthCounts: Object.fromEntries(HEALTH_ORDER.map((h) => [h, 0])),
    }
  }

  let sumH = 0
  let sumDbh = 0
  let totalAgb = 0
  let totalCo2 = 0
  let totalAnnCo2 = 0
  let totalAnnO2 = 0
  const healthCounts = Object.fromEntries(HEALTH_ORDER.map((h) => [h, 0]))

  for (const f of trees) {
    const p = f.properties
    sumH += p.heightM
    sumDbh += p.dbhCm
    totalAgb += p.agbTonnes
    totalCo2 += p.co2StoredTonnes
    totalAnnCo2 += p.annualCo2Tonnes
    totalAnnO2 += p.annualO2Tonnes
    if (healthCounts[p.health] !== undefined) healthCounts[p.health]++
    else healthCounts['Fair']++
  }

  return {
    count: n,
    avgHeightM: sumH / n,
    avgDbhCm: sumDbh / n,
    totalAgbTonnes: totalAgb,
    totalCo2StoredTonnes: totalCo2,
    totalAnnualCo2Tonnes: totalAnnCo2,
    totalAnnualO2Tonnes: totalAnnO2,
    healthCounts,
  }
}

function priorityRank(f) {
  const p = f.properties
  const riskW = { Extreme: 5, High: 4, Moderate: 2, Low: 0 }
  const healthW = { Critical: 4, Poor: 3, Fair: 2, Good: 0, Excellent: 0 }
  let s = 0
  s += healthW[p.health] ?? 0
  s += (riskW[p.riskRating] ?? 0) * 3
  if (p.interferesPowerLine) s += 4
  if (p.interferesBuilding) s += 4
  if (p.priorityFlag) s += 1
  return s
}

/** Trees warranting follow-up (mock inventory): Fair watchlist or priorityFlag (risk / conflicts). */
export function priorityTrees(collection) {
  const list = collection.features.filter((f) => {
    const p = f.properties
    if (p.health === 'Fair') return true
    if (p.priorityFlag) return true
    return false
  })
  list.sort((a, b) => priorityRank(b) - priorityRank(a))
  return list
}

/**
 * UI chips for a priority-row feature — mirrors `priorityTrees` inputs:
 * `health`, `riskRating`, `interferesPowerLine`, `interferesBuilding` (see `mockTrees` properties).
 */
export function priorityActionChips(feature) {
  const p = feature.properties
  const chips = []
  if (p.health === 'Fair') chips.push({ id: 'fair', tone: 'health', text: PRIORITY_CHIP_VI.fairWatch })
  if (p.riskRating === 'Extreme') chips.push({ id: 'rx', tone: 'risk', text: PRIORITY_CHIP_VI.extremeRisk })
  else if (p.riskRating === 'High') chips.push({ id: 'rh', tone: 'risk', text: PRIORITY_CHIP_VI.highRisk })
  if (p.interferesPowerLine) chips.push({ id: 'pl', tone: 'infra', text: PRIORITY_CHIP_VI.powerLine })
  if (p.interferesBuilding) chips.push({ id: 'bd', tone: 'infra', text: PRIORITY_CHIP_VI.building })
  if (chips.length === 0 && p.priorityFlag)
    chips.push({ id: 'pf', tone: 'infra', text: PRIORITY_CHIP_VI.flagged })
  return chips
}

export function hasWindRiskInventory(treesInBounds, opts = {}) {
  const windThresholdMs = opts.windThresholdMs ?? 10
  const windSpeed = opts.windSpeedMs ?? 0
  if (windSpeed < windThresholdMs) return false
  return treesInBounds.some((f) => {
    const p = f.properties
    if (p.health === 'Fair' || p.health === 'Poor' || p.health === 'Critical') return true
    const order = ['Low', 'Moderate', 'High', 'Extreme']
    return order.indexOf(p.riskRating) >= order.indexOf('Moderate')
  })
}
