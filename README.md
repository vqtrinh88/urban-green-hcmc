# UrbanGreen HCMC Dashboard

Vue 3 + Vite + Mapbox GL JS dashboard for urban canopy metrics along the BRD HCMC corridor.

## Requirements

- Node.js 22+

## Setup

```bash
nvm use 22   # if you use nvm
cp .env.example .env
# Edit .env: set VITE_MAPBOX_ACCESS_TOKEN and optionally VITE_OPENWEATHER_API_KEY (no quotes; key from openweathermap.org/api_keys)
npm install
npm run dev
# If you change .env, stop and restart `npm run dev` so Vite picks up VITE_* variables.
```

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
