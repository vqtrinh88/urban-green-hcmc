import { SPECIES_PROFILES } from '@/data/speciesProfiles.js'
import {
  computeAgbTonnes,
  computeCo2StoredTonnes,
  computeAnnualCo2Tonnes,
  computeAnnualO2Tonnes,
  perimeterCmToDbhCm,
} from '@/utils/ecosystemMath.js'

/** BRD corridor: lat, lng pairs */
export const CORRIDOR_START = { lat: 10.783312953114452, lng: 106.69095678886501 }
export const CORRIDOR_END = { lat: 10.77601844064777, lng: 106.69888268237159 }

/** 30 trees per side of the corridor (60 total), evenly spaced (see placement logic). */
export const MOCK_TREE_COUNT = 60

/**
 * Normalized positions (0 = corridor start, 1 = end) treated as major crossings / segment ends.
 * Trees are forbidden within INTERSECTION_CLEAR_FRAC of these — nothing sits “on the intersection”.
 */
export const CORRIDOR_INTERSECTION_T = [0, 0.17, 0.34, 0.51, 0.68, 0.85, 1]

/** Half-width (along corridor, as fraction of full segment) of each intersection exclusion zone. */
export const INTERSECTION_CLEAR_FRAC = 0.042

/**
 * Distance from the corridor centerline toward each sidewalk (m), so trees sit in two rows.
 * (Short segment — constant offset is adequate.)
 */
export const CORRIDOR_SIDE_OFFSET_M = 8

const EARTH_M = 6371000

const RISK_LEVELS = ['Low', 'Moderate', 'High', 'Extreme']

/** Health tiers present in mock inventory — use for dashboard donut (Poor/Critical are unused). */
export const INVENTORY_HEALTH_CHART_ORDER = ['Excellent', 'Good', 'Fair']

/** Mock inventory: no Poor/Critical; ~15% Fair; remainder Excellent/Good only. */
function pickMockTreeHealth(rng) {
  if (rng() < 0.15) return 'Fair'
  return rng() < 0.5 ? 'Excellent' : 'Good'
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function randomInRange(rng, min, max) {
  return lerp(min, max, rng())
}

function isInsideIntersectionExclusion(t) {
  return CORRIDOR_INTERSECTION_T.some((ix) => Math.abs(t - ix) < INTERSECTION_CLEAR_FRAC)
}

/** Dense sample of valid t along the corridor (excluding intersection buffers). */
function collectAllowedTValues(sampleCount = 600) {
  const out = []
  for (let i = 1; i < sampleCount; i++) {
    const t = i / sampleCount
    if (!isInsideIntersectionExclusion(t)) out.push(t)
  }
  return out
}

/** Even spacing over allowed arc-length, strictly on the corridor polyline (no lateral jitter). */
function evenlySpacedCorridorT(count) {
  const allowed = collectAllowedTValues()
  if (allowed.length === 0) {
    throw new Error('mockTrees: no corridor positions outside intersection exclusions')
  }
  if (count <= 0) return []
  if (count === 1) return [allowed[Math.floor(allowed.length / 2)]]
  const positions = []
  for (let j = 0; j < count; j++) {
    const idx = Math.round((j / (count - 1)) * (allowed.length - 1))
    positions.push(allowed[idx])
  }
  return positions
}

/** Bearing (rad, clockwise from north) of start→end along the corridor. */
function corridorTrackBearingRad() {
  const latMid = ((CORRIDOR_START.lat + CORRIDOR_END.lat) / 2) * (Math.PI / 180)
  const dLng = CORRIDOR_END.lng - CORRIDOR_START.lng
  const dLat = CORRIDOR_END.lat - CORRIDOR_START.lat
  return Math.atan2(dLng * Math.cos(latMid), dLat)
}

/** Move (lat,lng) by `m` metres along `bearingRad` (from north). */
function offsetMetres(lat, lng, bearingRad, m) {
  const latRad = (lat * Math.PI) / 180
  const north = Math.cos(bearingRad) * m
  const east = Math.sin(bearingRad) * m
  const dLat = (north / EARTH_M) * (180 / Math.PI)
  const dLng = (east / (EARTH_M * Math.cos(latRad))) * (180 / Math.PI)
  return { lat: lat + dLat, lng: lng + dLng }
}

/**
 * Point on one side of the road: `side` 'L' = left of travel start→end, 'R' = right.
 */
function lngLatCorridorSide(t, side) {
  const lng = lerp(CORRIDOR_START.lng, CORRIDOR_END.lng, t)
  const lat = lerp(CORRIDOR_START.lat, CORRIDOR_END.lat, t)
  const track = corridorTrackBearingRad()
  const perp = side === 'L' ? track - Math.PI / 2 : track + Math.PI / 2
  return offsetMetres(lat, lng, perp, CORRIDOR_SIDE_OFFSET_M)
}

/** @param {number} seed */
export function generateMockTrees(seed = 42, count = MOCK_TREE_COUNT) {
  const rng = mulberry32(seed)
  /** One station along the road → two trees (L/R). */
  const pairCount = Math.max(1, Math.ceil(count / 2))
  const tPositions = evenlySpacedCorridorT(pairCount)
  const features = []

  let i = 0
  outer: for (const t of tPositions) {
    for (const side of ['L', 'R']) {
      if (i >= count) break outer
      const { lat, lng } = lngLatCorridorSide(t, side)

      const species = pick(rng, SPECIES_PROFILES)
      const heightM = randomInRange(rng, 3, 5)
      const perimeterCm = randomInRange(rng, 35, 100)
      const canopyDiameterM = randomInRange(rng, 1.5, 4)
      const canopySpreadAreaM2 = Math.PI * (canopyDiameterM / 2) ** 2
      const dbhCm = perimeterCmToDbhCm(perimeterCm)

      const agbTonnes = computeAgbTonnes(dbhCm, species.rhoTm3)
      const co2StoredTonnes = computeCo2StoredTonnes(agbTonnes)
      const annualCo2Tonnes = computeAnnualCo2Tonnes(co2StoredTonnes)
      const annualO2Tonnes = computeAnnualO2Tonnes(agbTonnes)

      const health = pickMockTreeHealth(rng)
      const riskRating = pick(rng, RISK_LEVELS)
      const crownDiebackPct = Math.round(randomInRange(rng, 0, 25))
      const ageYears = Math.round(randomInRange(rng, 4, 18))

      const interferesPowerLine = rng() < 0.08
      const interferesBuilding = rng() < 0.06
      const priorityFlag =
        riskRating === 'High' ||
        riskRating === 'Extreme' ||
        interferesPowerLine ||
        interferesBuilding

      const lastPrune = daysAgo(rng, 40 + Math.floor(rng() * 400))
      const nextPrune = daysFromNow(rng, 30 + Math.floor(rng() * 180))

      const assetId = `TR-${String(8000 + i).slice(-4)}`

      features.push({
        type: 'Feature',
        id: assetId,
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        properties: {
          assetId,
          corridorSide: side,
          speciesId: species.id,
          commonName: species.commonName,
          scientificName: species.scientificName,
          meshVariant: species.meshVariant,
          rhoTm3: species.rhoTm3,
          heightM,
          perimeterCm,
          dbhCm,
          canopyDiameterM,
          canopySpreadAreaM2,
          crownDiebackPct,
          ageYears,
          health,
          riskRating,
          interferesPowerLine,
          interferesBuilding,
          priorityFlag,
          lastPruningDate: lastPrune,
          nextPruningDate: nextPrune,
          nextInspectionDate: daysFromNow(rng, 60 + Math.floor(rng() * 120)),
          agbTonnes,
          co2StoredTonnes,
          annualCo2Tonnes,
          annualO2Tonnes,
        },
      })
      i++
    }
  }

  for (const f of features) {
    const h = f.properties.health
    if (!INVENTORY_HEALTH_CHART_ORDER.includes(h)) {
      throw new Error(
        `[mockTrees] invalid health "${h}" for ${f.properties.assetId} — expected one of ${INVENTORY_HEALTH_CHART_ORDER.join(', ')}`,
      )
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

function daysAgo(rng, maxDays) {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(rng() * maxDays))
  return d.toISOString().slice(0, 10)
}

function daysFromNow(rng, maxDays) {
  const d = new Date()
  d.setDate(d.getDate() + Math.floor(rng() * maxDays))
  return d.toISOString().slice(0, 10)
}

export const MOCK_TREE_COLLECTION = generateMockTrees(42, MOCK_TREE_COUNT)
