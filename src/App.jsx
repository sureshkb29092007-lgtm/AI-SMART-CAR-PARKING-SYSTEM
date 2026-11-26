import { useState, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { LayoutDashboard, Box, ParkingSquare, Video, Zap, History as Hist, Radio, Cpu } from 'lucide-react'
import { useParking, fmtTime } from './store.jsx'
import { Dashboard, Garage, Slots, CCTV, EV, HistoryPage } from './pages/Pages.jsx'

const NAV = [
  ['dash', 'Dashboard', LayoutDashboard, Dashboard], ['garage', 'Live 3D Garage', Box, Garage],
  ['slots', 'Parking Slots', ParkingSquare, Slots], ['cctv', 'CCTV', Video, CCTV],
  ['ev', 'EV Charging', Zap, EV], ['hist', 'History', Hist, HistoryPage]]

export default function App() {
  const [page, setPage] = useState('garage')
  const { s, setAuto } = useParking()
  const main = useRef()
  useLayoutEffect(() => {
    gsap.fromTo(main.current.querySelectorAll('.card, .stat'), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: .55, stagger: .06, ease: 'power3.out' })
  }, [page])
  const Page = NAV.find(n => n[0] === page)[3]
  const free = s.slots.filter(x => !x.v).length
  return (
    <div className="app">
      <aside className="side">
        <div className="logo"><Cpu size={22} /><b>Park<span>AI</span></b></div>
        <nav>{NAV.map(([k, label, Icon]) => (
          <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}><Icon size={18} /><span>{label}</span></button>))}
        </nav>
        <div className="sys"><i className="dot" /> All systems online</div>
      </aside>
      <div className="content">
        <header className="top">
          <h1>{NAV.find(n => n[0] === page)[1]}</h1>
          <div className="chips">
            <span className="chip"><Radio size={14} /> LIVE · {fmtTime(Date.now())}</span>
            <span className="chip ok">{free}/{s.slots.length} free</span>
            <button className={'chip tog ' + (s.auto ? 'on' : '')} onClick={() => setAuto(!s.auto)}>Autopilot {s.auto ? 'ON' : 'OFF'}</button>
          </div>
        </header>
        <main ref={main} key={page}><Page /></main>
      </div>
    </div>)
}
