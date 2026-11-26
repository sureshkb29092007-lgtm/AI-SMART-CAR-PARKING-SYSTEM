import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

const FREE = '#22c55e', OCC = '#f97316', CHG = '#a855f7'

function Model({ type, color }) {
  if (type === 'bike') return (
    <group>
      <mesh position={[0, .55, 0]}><boxGeometry args={[.3, .4, 1.2]} /><meshStandardMaterial color={color} metalness={.7} roughness={.3} /></mesh>
      <mesh position={[0, .9, -.1]}><boxGeometry args={[.4, .35, .4]} /><meshStandardMaterial color="#111827" /></mesh>
      {[-.65, .65].map(z => <mesh key={z} position={[0, .3, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.3, .3, .14, 16]} /><meshStandardMaterial color="#020617" /></mesh>)}
      <mesh position={[0, .6, .62]}><boxGeometry args={[.2, .1, .05]} /><meshBasicMaterial color="#fff7ae" /></mesh>
    </group>)
  return (
    <group>
      <mesh position={[0, .5, 0]}><boxGeometry args={[1.8, .55, 4]} /><meshStandardMaterial color={color} metalness={.8} roughness={.25} /></mesh>
      <mesh position={[0, 1, -.2]}><boxGeometry args={[1.5, .5, 2]} /><meshStandardMaterial color="#0b1220" metalness={.9} roughness={.1} /></mesh>
      {[[-.95, 1.2], [.95, 1.2], [-.95, -1.2], [.95, -1.2]].map(([x, z], i) => <mesh key={i} position={[x, .32, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.34, .34, .25, 18]} /><meshStandardMaterial color="#020617" /></mesh>)}
      {[-.6, .6].map(x => <mesh key={'h' + x} position={[x, .55, 2.01]}><boxGeometry args={[.4, .12, .04]} /><meshBasicMaterial color="#fff7ae" /></mesh>)}
      {[-.6, .6].map(x => <mesh key={'t' + x} position={[x, .55, -2.01]}><boxGeometry args={[.4, .1, .04]} /><meshBasicMaterial color="#ff2d55" /></mesh>)}
      {type === 'ev' && <mesh position={[0, .1, 0]}><boxGeometry args={[1.7, .04, 3.6]} /><meshBasicMaterial color="#a855f7" /></mesh>}
    </group>)
}

function Vehicle({ type, color, at, rot = 0, path, onDone }) {
  const g = useRef(), i = useRef(1), done = useRef(false)
  useFrame((_, dt) => {
    if (!path || !g.current) return
    const p = g.current.position, t = path[i.current]
    if (!t) { if (!done.current) { done.current = true; onDone && onDone() } return }
    const dx = t[0] - p.x, dz = t[2] - p.z, d = Math.hypot(dx, dz)
    if (d < .05) { i.current++; return }
    const st = Math.min(d, (type === 'bike' ? 6 : 4.5) * Math.min(dt, .05))
    p.x += dx / d * st; p.z += dz / d * st
    let diff = Math.atan2(dx, dz) - g.current.rotation.y
    diff = Math.atan2(Math.sin(diff), Math.cos(diff))
    g.current.rotation.y += diff * Math.min(1, dt * 6)
  })
  return <group ref={g} position={path ? path[0] : at} rotation={[0, rot, 0]}><Model type={type} color={color} /></group>
}

function Charger({ x, z, on }) {
  const m = useRef()
  useFrame(({ clock }) => { if (m.current) m.current.emissiveIntensity = on ? 1.5 + Math.sin(clock.elapsedTime * 4) : .3 })
  return <mesh position={[x, .8, z * 1.42]}><boxGeometry args={[.45, 1.6, .3]} /><meshStandardMaterial ref={m} color="#1e1b4b" emissive="#a855f7" /></mesh>
}

function Cam({ x, z, i, ok }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current && ok) g.current.rotation.y = Math.sin(clock.elapsedTime * .8 + i) * .9 })
  return (
    <group position={[x, 3.6, z * .55]}>
      <mesh position={[0, .35, 0]}><boxGeometry args={[.05, .6, .05]} /><meshStandardMaterial color="#334155" /></mesh>
      <group ref={g}>
        <mesh><boxGeometry args={[.25, .2, .5]} /><meshStandardMaterial color="#1e293b" /></mesh>
        <mesh position={[0, 0, .28]}><sphereGeometry args={[.07]} /><meshBasicMaterial color={ok ? '#ff2d55' : '#475569'} /></mesh>
      </group>
    </group>)
}

function Slot({ sl, i }) {
  const w = sl.type === 'bike' ? 1.5 : 3
  const charging = sl.type === 'ev' && sl.v && sl.v.parked
  const c = charging ? CHG : sl.v ? OCC : FREE
  return (
    <group>
      <mesh position={[sl.x, .03, sl.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - .2, 4.4]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={.55} transparent opacity={.5} />
      </mesh>
      <Text position={[sl.x, .06, sl.z * .3]} rotation={[-Math.PI / 2, 0, 0]} fontSize={.5} color="#e0f2fe">{sl.id}</Text>
      {sl.type === 'ev' && <Charger x={sl.x} z={sl.z} on={charging} />}
      <Cam x={sl.x} z={sl.z} i={i} ok={sl.camOk} />
    </group>)
}

function Gate({ s, k, x, color, label }) {
  const arm = useRef()
  useFrame((_, dt) => { const t = s.gates[k] ? -1.35 : 0; arm.current.rotation.x += (t - arm.current.rotation.x) * Math.min(1, dt * 5) })
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, .9, -3.7]}><boxGeometry args={[.9, 1.8, .9]} /><meshStandardMaterial color="#0f172a" emissive={color} emissiveIntensity={.25} /></mesh>
      <group ref={arm} position={[0, 1.1, -3.2]}>
        <mesh position={[0, 0, 3.2]}><boxGeometry args={[.14, .14, 6.4]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} /></mesh>
      </group>
      <mesh position={[0, 2.2, -3.7]}><boxGeometry args={[.5, .3, .3]} /><meshBasicMaterial color={k === 'in' && s.scanning ? '#ffffff' : color} /></mesh>
      <Text position={[0, .05, -2.2]} rotation={[-Math.PI / 2, 0, 0]} fontSize={.55} color={color}>{label}</Text>
    </group>)
}

function Scene({ s, arrive }) {
  return (
    <>
      <color attach="background" args={['#030712']} />
      <fog attach="fog" args={['#030712', 35, 75]} />
      <ambientLight intensity={.45} />
      <directionalLight position={[8, 20, 10]} intensity={.8} />
      <pointLight position={[-10, 5, 0]} color="#38bdf8" intensity={60} distance={30} />
      <pointLight position={[10, 5, 0]} color="#a855f7" intensity={60} distance={30} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[54, 30]} /><meshStandardMaterial color="#050b1a" metalness={.6} roughness={.35} /></mesh>
      <gridHelper args={[54, 54, '#0ea5e9', '#0b2a4a']} position={[0, .01, 0]} />
      <mesh position={[0, .015, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[40, 6]} /><meshStandardMaterial color="#0a1226" /></mesh>
      {Array.from({ length: 18 }, (_, i) => <mesh key={i} position={[-17 + i * 2, .03, 0]}><boxGeometry args={[1, .01, .12]} /><meshBasicMaterial color="#facc15" /></mesh>)}
      {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[-18 + i * 6, 4.6, 0]}><boxGeometry args={[2.2, .08, .3]} /><meshBasicMaterial color="#7dd3fc" /></mesh>)}
      <mesh position={[0, 2, -9.5]}><boxGeometry args={[42, 4, .3]} /><meshStandardMaterial color="#0b1224" /></mesh>
      <mesh position={[0, 3.9, -9.3]}><boxGeometry args={[42, .08, .1]} /><meshBasicMaterial color="#38bdf8" /></mesh>
      <mesh position={[0, 2, 9.5]}><boxGeometry args={[42, 4, .3]} /><meshStandardMaterial color="#0b1224" /></mesh>
      <mesh position={[0, 3.9, 9.3]}><boxGeometry args={[42, .08, .1]} /><meshBasicMaterial color="#a855f7" /></mesh>
      <Gate s={s} k="in" x={-15} color="#22c55e" label="ENTRY" />
      <Gate s={s} k="out" x={15} color="#f97316" label="EXIT" />
      {s.slots.map((sl, i) => <Slot key={sl.id} sl={sl} i={i} />)}
      {s.slots.filter(x => x.v && x.v.parked).map(x => <Vehicle key={x.id + x.v.plate} type={x.v.type} color={x.v.color} at={[x.x, 0, x.z]} rot={x.z < 0 ? Math.PI : 0} />)}
      {s.anims.map(a => <Vehicle key={a.id} type={a.type} color={a.color} path={a.path} rot={a.rot0} onDone={() => arrive(a)} />)}
      <OrbitControls enableDamping maxPolarAngle={Math.PI / 2.15} minDistance={8} maxDistance={50} />
      <EffectComposer><Bloom intensity={.9} luminanceThreshold={.35} mipmapBlur /></EffectComposer>
    </>)
}

export default function Garage3D({ s, arrive }) {
  return (
    <Canvas camera={{ position: [0, 17, 24], fov: 45 }} dpr={[1, 1.75]}>
      <Scene s={s} arrive={arrive} />
    </Canvas>)
}
