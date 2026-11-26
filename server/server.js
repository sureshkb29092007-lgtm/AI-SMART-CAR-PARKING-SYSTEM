// ParkAI backend (Node + Express). In-memory repo — replace `db` with MongoDB/PostgreSQL (Prisma/Mongoose) when ready.
import express from 'express'
import cors from 'cors'
const app = express(); app.use(cors(), express.json())
const RATE = { car: 30, ev: 25, bike: 10 }
const db = { slots: [...Array(8)].map((_, i) => ({ id: 'C' + (i + 1), type: 'car', vehicle: null })).concat([...Array(5)].map((_, i) => ({ id: 'E' + (i + 1), type: 'ev', vehicle: null })), [...Array(6)].map((_, i) => ({ id: 'B' + (i + 1), type: 'bike', vehicle: null }))), history: [] }
app.get('/api/slots', (_, r) => r.json(db.slots))
app.get('/api/history', (_, r) => r.json(db.history))
app.post('/api/entry', (q, r) => {
  const { plate, type } = q.body
  if (!/^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}$/.test(plate || '')) return r.status(400).json({ error: 'Invalid plate' })
  const slot = db.slots.find(s => s.type === type && !s.vehicle)
  if (!slot) return r.status(409).json({ error: 'No free slot' })
  slot.vehicle = { plate, type, entry: Date.now() }; db.history.unshift({ kind: 'ENTRY', plate, slot: slot.id, time: Date.now() })
  r.json({ slot: slot.id })
})
app.post('/api/exit', (q, r) => {
  const slot = db.slots.find(s => s.vehicle?.plate === q.body.plate)
  if (!slot) return r.status(404).json({ error: 'Not found' })
  const mins = (Date.now() - slot.vehicle.entry) / 60000
  const fee = mins <= 10 ? 0 : Math.ceil(mins / 60) * RATE[slot.type]
  db.history.unshift({ kind: 'EXIT', plate: slot.vehicle.plate, slot: slot.id, fee, time: Date.now() }); slot.vehicle = null
  r.json({ fee })
})
app.listen(4000, () => console.log('ParkAI API on http://localhost:4000'))
