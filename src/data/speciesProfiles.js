/**
 * Wood density ρ in t·m⁻³ for BRD allometry (order-of-magnitude literature values; tune if needed).
 * Samanea saman / Lagerstroemia speciosa — tropical urban broadleaf band.
 */
export const SPECIES_PROFILES = [
  {
    id: 'samanea_saman',
    commonName: 'Rain tree',
    scientificName: 'Samanea saman',
    rhoTm3: 0.56,
    meshVariant: 'umbrella',
  },
  {
    id: 'lagerstroemia_speciosa',
    commonName: "Queen's crape-myrtle",
    scientificName: 'Lagerstroemia speciosa',
    rhoTm3: 0.58,
    meshVariant: 'rounded',
  },
  {
    id: 'lagerstroemia_indica',
    commonName: 'Crape myrtle',
    scientificName: 'Lagerstroemia indica',
    rhoTm3: 0.57,
    meshVariant: 'rounded',
  },
  {
    id: 'tabebuia_rosea',
    commonName: 'Pink trumpet tree',
    scientificName: 'Tabebuia rosea',
    rhoTm3: 0.55,
    meshVariant: 'umbrella',
  },
]

export function getSpeciesById(id) {
  return SPECIES_PROFILES.find((s) => s.id === id) ?? SPECIES_PROFILES[0]
}
