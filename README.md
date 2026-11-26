# ParkAI – AI Smart Parking Management
React + Three.js (React Three Fiber) + GSAP + Lucide, with an optional Node/Express API.

## Run
    npm install
    npm run dev          # frontend  → http://localhost:5173
    npm run server       # optional API → http://localhost:4000

## Structure
- `src/store.jsx` – simulation engine (ANPR, slot assignment, fees, EV charging, alerts, autopilot)
- `src/components/Garage3D.jsx` – 3D garage, vehicles, gates, chargers, cameras
- `src/pages/Pages.jsx` – Dashboard, Live Garage, Slots, CCTV, EV, History
- `server/server.js` – REST API with an in-memory repo, ready to swap for MongoDB/PostgreSQL

Pricing: first 10 sim-minutes free, then hourly (car Rs30, EV Rs25, bike Rs10) × demand multiplier (x1 / x1.25 / x1.5). 1 real second = 2 simulated minutes.
# AI-CAR-PARKING-SYSTEM
