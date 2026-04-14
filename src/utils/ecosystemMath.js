/**
 * BRD §4 — D = DBH in centimeters; ρ = wood density in t·m⁻³.
 * AGB = ρ * exp(-1.499 + 2.148*ln(D) + 0.207*(ln(D))² - 0.0281*(ln(D))³)
 */
export function computeAgbTonnes(dbhCm, rhoTm3) {
  if (dbhCm <= 0 || rhoTm3 <= 0) return 0
  const lnD = Math.log(dbhCm)
  const lnD2 = lnD * lnD
  const lnD3 = lnD2 * lnD
  const exponent = -1.499 + 2.148 * lnD + 0.207 * lnD2 - 0.0281 * lnD3
  return rhoTm3 * Math.exp(exponent)
}

/** Carbon = 0.5 * AGB; CO₂ stored = Carbon * 3.67 (BRD §4) */
export function computeCo2StoredTonnes(agbTonnes) {
  const carbonTonnes = 0.5 * agbTonnes
  return carbonTonnes * 3.67
}

/** Mock annual flux: small fraction of stored pool (labelled “estimated” in UI). */
export function computeAnnualCo2Tonnes(co2StoredTonnes, growthFraction = 0.025) {
  return co2StoredTonnes * growthFraction
}

/**
 * Mock annual O₂ (t) — BRD does not define a formula; placeholder k·AGB (document in UI).
 * Rough order-of-magnitude for demo only.
 */
export function computeAnnualO2Tonnes(agbTonnes, k = 0.85) {
  return agbTonnes * k
}

export function perimeterCmToDbhCm(perimeterCm) {
  return perimeterCm / Math.PI
}
