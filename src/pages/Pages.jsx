import { useState } from 'react'
import { Car, Bike, Zap, LogIn, LogOut, Shuffle, ScanLine, Camera, Video, ParkingSquare, IndianRupee, BatteryCharging, Activity, ShieldAlert } from 'lucide-react'
import Garage3D from '../components/Garage3D.jsx'
import { useParking, randPlate, fmtTime } from '../store.jsx'

const Ico = ({ t, size = 16 }) => t === 'bike' ? <Bike size={size} /> : t === 'ev' ? <Zap size={size} /> : <Car size={size} />
const tone = sl => sl.type === 'ev' && sl.v?.parked ? 'purple' : sl.v ? 'orange' : 'green'

export function Dashboard() {
  const { s } = useParking()
  const cnt = t => s.slots.filter(x => x.v && x.v.type === t).length
  const occ = s.slots.filter(x => x.v).length, total = s.slots.length
  const charging = s.slots.filter(x => x.type === 'ev' && x.v?.parked && x.v.battery < 100).length
  const cards = [['Total Spaces', total, ParkingSquare], ['Occupied', occ, Car], ['Available', total - occ, ParkingSquare], ['Cars', cnt('car'), Car], ['Bikes', cnt('bike'), Bike], ['EVs', cnt('ev'), Zap], ['Active Chargers', charging, BatteryCharging], ['Revenue (Rs)', Math.round(s.revenue), IndianRupee]]
  const max = Math.max(...s.hourly.map(h => h.rev), 1)
  const pct = Math.round(occ / total * 100)
  return (<>
    <div className="grid4">{cards.map(([l, v, I]) => <div className="stat" key={l}><I size={20} /><small>{l}</small><b>{v}</b></div>)}</div>
    <div className="grid2">
      <div className="card"><h3><IndianRupee size={16} /> Revenue analytics (hourly)</h3>
        <div className="bars">{s.hourly.map(h => <div key={h.h}><em style={{ height: `${h.rev / max * 100}%` }} /><span>{h.h}</span></div>)}</div></div>
      <div className="card center"><h3><Activity size={16} /> Occupancy &amp; traffic</h3>
        <div className="ring" style={{ background: `conic-gradient(#38bdf8 ${pct}%, #1e293b 0)` }}><b>{pct}%</b></div>
        <p>Entries today: <b>{s.cin + s.hourly.reduce((a, h) => a + h.ent, 0)}</b> · Exits: <b>{s.cout}</b></p></div>
    </div>
    <div className="card"><h3><Activity size={16} /> Recent activity</h3><LogTable rows={s.log.slice(0, 8)} /></div>
  </>)
}

function LogTable({ rows }) {
  return (<div className="scroll"><table><thead><tr><th>Time</th><th>Event</th><th>Plate</th><th>Slot</th><th>Type</th><th>Fee</th></tr></thead>
    <tbody>{rows.length ? rows.map(r => <tr key={r.id}><td>{fmtTime(r.time)}</td><td className={r.kind === 'ENTRY' ? 'g' : 'o'}>{r.kind}</td><td>{r.plate}</td><td>{r.slot}</td><td><Ico t={r.vtype} size={14} /></td><td>{r.fee != null ? 'Rs ' + r.fee : '—'}</td></tr>) : <tr><td colSpan="6">No activity yet — autopilot will start shortly.</td></tr>}</tbody></table></div>)
}
export const HistoryPage = () => { const { s } = useParking(); return <div className="card"><h3>Entry &amp; exit history</h3><LogTable rows={s.log} /></div> }

function EntryPanel() {
  const P = useParking(), s = P.s
  const [plate, setPlate] = useState(randPlate()), [type, setType] = useState('car'), [res, setRes] = useState(null)
  const go = async () => { if (s.scanning) return; setRes(null); const r = await P.scan(plate, type); setRes(r); if (r.ok) setPlate(randPlate()) }
  return (<div className="card"><h3><LogIn size={16} /> AI Entry Gate · ANPR</h3>
    <div className={'plate ' + (s.scanning ? 'scan' : '')}><span>{plate.toUpperCase()}</span><i /></div>
    <input value={plate} onChange={e => setPlate(e.target.value)} placeholder="Registration number" />
    <div className="seg">{['car', 'bike', 'ev'].map(t => <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}><Ico t={t} /> {t.toUpperCase()}</button>)}</div>
    <div className="row"><button className="btn" onClick={go} disabled={s.scanning}><ScanLine size={16} /> {s.scanning ? 'Scanning…' : 'Scan & enter'}</button>
      <button className="btn ghost" onClick={() => setPlate(randPlate())}><Shuffle size={16} /></button></div>
    {res && <p className={res.ok ? 'ok' : 'bad'}>{res.ok ? `Plate verified (${Math.round(res.conf * 100)}%) → slot ${res.slot}. Barrier opening.` : res.msg}</p>}</div>)
}
function ExitPanel() {
  const P = useParking(), s = P.s
  const parked = s.slots.filter(x => x.v?.parked)
  const [sel, setSel] = useState(''), [res, setRes] = useState(null)
  const id = parked.find(x => x.id === sel) ? sel : parked[0]?.id
  return (<div className="card"><h3><LogOut size={16} /> Exit Gate &amp; Payment</h3>
    <select value={id || ''} onChange={e => setSel(e.target.value)}>{parked.map(x => <option key={x.id} value={x.id}>{x.id} · {x.v.plate}</option>)}</select>
    <button className="btn warn" disabled={!id} onClick={() => setRes(P.exit(id))}><LogOut size={16} /> Pay &amp; exit</button>
    {res && <p className={res.ok ? 'ok' : 'bad'}>{res.ok ? `${res.plate}: ${res.mins} min parked · fee Rs ${res.fee} (x${P.mult()}). Barrier opening.` : res.msg}</p>}</div>)
}
export function Garage() {
  const P = useParking(), s = P.s
  const free = t => s.slots.filter(x => x.type === t && !x.v).length
  return (<div className="garage">
    <div className="card view3d"><Garage3D s={s} arrive={P.arrive} />
      <div className="legend"><i className="g" />Available <i className="o" />Occupied <i className="p" />EV charging</div></div>
    <div className="side-panels">
      <div className="card avail">{['car', 'bike', 'ev'].map(t => <div key={t}><Ico t={t} size={18} /><b>{free(t)}</b><small>free {t}</small></div>)}</div>
      <EntryPanel /><ExitPanel />
    </div></div>)
}

export function Slots() {
  const { s } = useParking()
  return (<>{[['car', 'Car parking'], ['bike', 'Bike parking'], ['ev', 'EV parking']].map(([t, l]) => (
    <div className="card" key={t}><h3><Ico t={t} /> {l}</h3>
      <div className="slotgrid">{s.slots.filter(x => x.type === t).map(x => (
        <div key={x.id} className={'slot ' + tone(x)}><b>{x.id}</b><small>{x.v ? x.v.plate : 'Available'}</small>{x.v && <small>{fmtTime(x.v.t)}</small>}</div>))}</div></div>))}
    <div className="legend"><i className="g" />Available <i className="o" />Occupied <i className="p" />EV charging</div></>)
}

export function CCTV() {
  const { s } = useParking()
  const now = Date.now()
  const online = s.slots.filter(x => x.camOk).length
  return (<div className="cctv">
    <div className="grid4 mini"><div className="stat"><Video size={18} /><small>Cameras online</small><b>{online}/{s.slots.length}</b></div>
      <div className="stat"><i className="rec" /><small>Recording</small><b>{online}</b></div>
      <div className="stat"><Activity size={18} /><small>Motion now</small><b>{s.slots.filter(x => now - x.last < 6000).length}</b></div></div>
    <div className="camgrid">{s.slots.map(x => {
      const motion = now - x.last < 6000
      return (<div key={x.id} className={'cam ' + (x.camOk ? '' : 'off')}>
        <div className="feed">{x.camOk ? <>{x.v?.parked && <span className="sil"><Ico t={x.type} size={34} /></span>}
          {motion && <span className="mbox">MOTION</span>}<span className="sweep"><Camera size={14} /></span></> : <em>RECONNECTING…</em>}</div>
        <div className="meta"><b>CAM-{x.id}</b>{x.camOk ? <><span className="rec" /> REC</> : <span className="bad">OFFLINE</span>}<small>{x.v ? x.v.plate : 'empty'}</small></div></div>)
    })}</div>
    <div className="card"><h3><ShieldAlert size={16} /> Security alerts</h3>
      <ul className="alerts">{s.alerts.map(a => <li key={a.id} className={a.lvl}><small>{a.t}</small> {a.msg}</li>)}</ul></div></div>)
}

export function EV() {
  const { s } = useParking()
  const evs = s.slots.filter(x => x.type === 'ev')
  return (<>
    <div className="grid4 mini"><div className="stat"><Zap size={18} /><small>Stations</small><b>{evs.length}</b></div>
      <div className="stat"><BatteryCharging size={18} /><small>Charging</small><b>{evs.filter(x => x.v?.parked && x.v.battery < 100).length}</b></div>
      <div className="stat"><ParkingSquare size={18} /><small>Available</small><b>{evs.filter(x => !x.v).length}</b></div></div>
    <div className="evgrid">{evs.map(x => {
      const b = x.v?.battery || 0, on = x.v?.parked && b < 100
      return (<div key={x.id} className={'card ev ' + (on ? 'glow' : '')}><h3><Zap size={16} /> Station {x.id}</h3>
        {x.v ? <><p>{x.v.plate}</p><div className="batt"><em style={{ width: b + '%' }} /></div>
          <p><b>{Math.round(b)}%</b> · {x.v.parked ? (on ? '22 kW · charging' : 'fully charged') : 'arriving…'}</p>
          {on && <small>ETA {Math.ceil((100 - b) / 1.2 / 30 * 60)} sim-min</small>}</> : <p className="g">Available</p>}</div>)
    })}</div></>)
}
