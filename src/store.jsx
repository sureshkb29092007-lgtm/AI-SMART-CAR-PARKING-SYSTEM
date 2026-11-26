// Simulation engine. State lives in a mutable ref (fast, synchronous) and components re-render via up().
// To go to production, swap the bodies of enter()/exit() for fetch() calls to /api (see server/server.js).
import { createContext, useContext, useRef, useState, useEffect } from 'react'
const Ctx = createContext()
export const useParking = () => useContext(Ctx)
export const RATE = { car: 30, ev: 25, bike: 10 }
const COL = ['#38bdf8', '#e2e8f0', '#f43f5e', '#facc15', '#818cf8', '#34d399', '#fb923c']
const pick = a => a[Math.floor(Math.random() * a.length)]
const L = 'ABCDEFGHJKLMNPRSTUVWXYZ'
export const randPlate = () => `${pick(['MH', 'DL', 'KA', 'TN', 'GJ', 'UP'])} ${10 + Math.floor(Math.random() * 89)} ${pick(L)}${pick(L)} ${1000 + Math.floor(Math.random() * 8999)}`
export const validPlate = p => /^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}$/.test(p.trim().toUpperCase())
export const fmtTime = d => new Date(d).toLocaleTimeString([], { hour12: false })
let uid = 0

function init() {
  const slots = []
  for (let i = 0; i < 8; i++) slots.push({ id: 'C' + (i + 1), type: 'car', x: -12 + i * 3, z: -5 })
  for (let i = 0; i < 5; i++) slots.push({ id: 'E' + (i + 1), type: 'ev', x: -12 + i * 3, z: 5 })
  for (let i = 0; i < 6; i++) slots.push({ id: 'B' + (i + 1), type: 'bike', x: 4.5 + i * 1.5, z: 5 })
  slots.forEach(s => { s.v = null; s.last = 0; s.camOk = s.id !== 'B6' })
  ;['C1', 'C3', 'C4', 'C7', 'E2', 'E4', 'B1', 'B3'].forEach(id => {
    const s = slots.find(x => x.id === id)
    s.v = { plate: randPlate(), type: s.type, t: Date.now() - Math.random() * 3e5, parked: true, color: pick(COL), battery: s.type === 'ev' ? 20 + Math.random() * 60 : 0 }
  })
  const hourly = '08 09 10 11 12 13 14 15'.split(' ').map(h => ({ h, rev: Math.round(400 + Math.random() * 900), ent: Math.round(8 + Math.random() * 20) }))
  hourly.push({ h: 'Now', rev: 0, ent: 0 })
  return { slots, anims: [], gates: { in: 0, out: 0 }, log: [], alerts: [], cin: 0, cout: 0, revenue: 0, scanning: false, auto: true, hourly }
}

export function ParkingProvider({ children }) {
  const R = useRef(null)
  if (!R.current) R.current = init()
  const [, setN] = useState(0)
  const up = () => setN(n => n + 1)
  const s = R.current

  const alert = (msg, lvl = 'info') => { s.alerts.unshift({ id: ++uid, t: fmtTime(Date.now()), msg, lvl }); s.alerts.length = Math.min(s.alerts.length, 25) }
  const addLog = e => { s.log.unshift({ id: ++uid, time: Date.now(), ...e }); s.log.length = Math.min(s.log.length, 200) }
  const open = k => { s.gates[k] = 1; setTimeout(() => { s.gates[k] = 0; up() }, 2800) }
  const mult = () => { const o = s.slots.filter(x => x.v).length / s.slots.length; return o > .8 ? 1.5 : o > .5 ? 1.25 : 1 }

  const enter = (plate, type) => {
    plate = plate.trim().toUpperCase()
    if (!validPlate(plate)) return { ok: false, msg: 'ANPR: invalid plate format' }
    if (s.slots.some(x => x.v && x.v.plate === plate)) return { ok: false, msg: 'Vehicle is already inside' }
    const slot = s.slots.find(x => x.type === type && !x.v)
    if (!slot) return { ok: false, msg: `No free ${type.toUpperCase()} slot available` }
    const color = pick(COL)
    slot.v = { plate, type, t: Date.now(), parked: false, color, battery: type === 'ev' ? 10 + Math.random() * 50 : 0 }
    s.anims.push({ id: ++uid, kind: 'in', slotId: slot.id, type, color, rot0: Math.PI / 2, path: [[-19, 0, 0], [slot.x, 0, 0], [slot.x, 0, slot.z]] })
    s.cin++; s.hourly.at(-1).ent++
    open('in'); addLog({ kind: 'ENTRY', plate, slot: slot.id, vtype: type }); alert(`ANPR read ${plate} → assigned ${slot.id}`)
    up(); return { ok: true, slot: slot.id }
  }
  const exit = id => {
    const sl = s.slots.find(x => x.id === id)
    if (!sl || !sl.v || !sl.v.parked) return { ok: false, msg: 'Vehicle is not parked yet' }
    const v = sl.v, mins = Math.round((Date.now() - v.t) / 1000 * 2) // 1 real sec = 2 simulated minutes
    const fee = mins <= 10 ? 0 : Math.ceil(mins / 60) * RATE[v.type] * mult()
    s.anims.push({ id: ++uid, kind: 'out', type: v.type, color: v.color, rot0: sl.z < 0 ? 0 : Math.PI, path: [[sl.x, 0, sl.z], [sl.x, 0, 0], [19, 0, 0]] })
    sl.v = null; sl.last = Date.now(); s.cout++; s.revenue += fee; s.hourly.at(-1).rev += fee
    open('out'); addLog({ kind: 'EXIT', plate: v.plate, slot: sl.id, vtype: v.type, fee }); alert(`${v.plate} left ${sl.id} · Rs ${fee}`)
    up(); return { ok: true, fee, mins, plate: v.plate }
  }
  const arrive = a => {
    s.anims = s.anims.filter(x => x.id !== a.id)
    if (a.kind === 'in') { const sl = s.slots.find(x => x.id === a.slotId); if (sl && sl.v) { sl.v.parked = true; sl.last = Date.now(); alert(`Motion: vehicle detected in ${sl.id}`, 'warn') } }
    up()
  }
  const scan = (plate, type) => new Promise(r => {
    s.scanning = true; up()
    setTimeout(() => { s.scanning = false; const conf = .82 + Math.random() * .17; const res = enter(plate, type); up(); r({ ...res, conf }) }, 1500)
  })
  const autoStep = () => {
    const occ = s.slots.filter(x => x.v).length / s.slots.length
    const parked = s.slots.filter(x => x.v && x.v.parked && Date.now() - x.v.t > 8000)
    if ((occ > .75 || Math.random() < .4) && parked.length) exit(pick(parked).id)
    else enter(randPlate(), pick(['car', 'car', 'car', 'ev', 'ev', 'bike', 'bike']))
  }
  useEffect(() => {
    let n = 0
    const id = setInterval(() => {
      n++
      s.slots.forEach(x => { if (x.type === 'ev' && x.v && x.v.parked && x.v.battery < 100) x.v.battery = Math.min(100, x.v.battery + 1.2) })
      if (s.auto && n % 5 === 0) autoStep()
      up()
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return <Ctx.Provider value={{ s, enter, exit, scan, arrive, mult, setAuto: v => { s.auto = v; up() } }}>{children}</Ctx.Provider>
}
