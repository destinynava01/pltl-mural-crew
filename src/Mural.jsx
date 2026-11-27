// The shared mural: one scene (a different one each game) runs across the whole wall, and every team owns a
// section of it. Each right answer sprays the team's pieces onto its section in the team color; the piece the team
// is working on shows as a faint pencil sketch.
//   scene:  'city' | 'sunset' | 'ocean' | 'night' | 'canyon'
//   teams:  [{ name, color, wall: Path[][] (the painted pieces), sketch?: Path[] (the current piece) }]
//   seed:   changes the scene's details (a second row of the wall gets its own skyline)
import { useId } from 'react'

const S = 200 // one section is S×S
const UNIT = 9 // svg units per grid unit inside a section (±10 fits with a margin)

function rng(seed) {
  let s = (seed * 9301 + 49297) % 233280 || 1
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// ---- Scenes (drawn across the full width W, height S) ----
function City({ W, r, id }) {
  const blocks = []
  for (let x = -10; x < W; ) {
    const w = 18 + r() * 26
    const h = 60 + r() * 80
    blocks.push({ x, w, h })
    x += w + 2
  }
  return (
    <>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2e1a55" /><stop offset="0.6" stopColor="#9d3c72" /><stop offset="1" stopColor="#f97366" />
        </linearGradient>
      </defs>
      <rect width={W} height={S} fill={`url(#${id}sky)`} />
      <circle cx={W * 0.72} cy={S * 0.62} r="26" fill="#fcd9a8" opacity="0.8" />
      {blocks.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={S - b.h} width={b.w} height={b.h} fill={i % 2 ? '#1d1530' : '#251a3b'} />
          {Array.from({ length: Math.floor(b.h / 14) }, (_, row) => Array.from({ length: Math.floor(b.w / 9) }, (_, col) => (
            r() < 0.35 && <rect key={`${row}-${col}`} x={b.x + 3 + col * 9} y={S - b.h + 6 + row * 14} width="4" height="6" fill="#fde68a" opacity="0.55" />
          )))}
        </g>
      ))}
    </>
  )
}

function Sunset({ W, r, id }) {
  const ridge = (base, amp, step) => {
    let d = `M0 ${S}`
    for (let x = 0; x <= W + step; x += step) d += ` L${x} ${base - r() * amp}`
    return `${d} L${W + step} ${S} Z`
  }
  return (
    <>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c1d95" /><stop offset="0.5" stopColor="#db2777" /><stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <rect width={W} height={S} fill={`url(#${id}sky)`} />
      <circle cx={W * 0.35} cy={S * 0.7} r="34" fill="#fde68a" opacity="0.9" />
      <path d={ridge(130, 50, 40)} fill="#6b2160" />
      <path d={ridge(165, 40, 28)} fill="#3b1240" />
    </>
  )
}

function Ocean({ W, r, id }) {
  const waves = []
  for (let row = 0; row < 7; row++) {
    const y = 122 + row * 11
    let d = `M0 ${y}`
    for (let x = 0; x <= W; x += 24) d += ` q6 -5 12 0 t12 0`
    waves.push(<path key={row} d={d} fill="none" stroke="#a5f3fc" strokeOpacity={0.35 - row * 0.03} strokeWidth="1.5" transform={`translate(${(r() - 0.5) * 20} 0)`} />)
  }
  return (
    <>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" /><stop offset="1" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id={`${id}sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e7490" /><stop offset="1" stopColor="#083344" />
        </linearGradient>
      </defs>
      <rect width={W} height={S} fill={`url(#${id}sky)`} />
      <circle cx={W * 0.6} cy={112} r="24" fill="#fff7d6" opacity="0.9" />
      <rect y={115} width={W} height={S - 115} fill={`url(#${id}sea)`} />
      {waves}
    </>
  )
}

function Night({ W, r, id }) {
  const stars = Array.from({ length: Math.round(W / 6) }, () => ({ x: r() * W, y: r() * 140, s: 0.4 + r() * 1.2 }))
  let hill = `M0 ${S}`
  for (let x = 0; x <= W + 30; x += 30) hill += ` Q${x + 15} ${150 - r() * 25} ${x + 30} ${160 + r() * 10}`
  return (
    <>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070b22" /><stop offset="1" stopColor="#312e81" />
        </linearGradient>
      </defs>
      <rect width={W} height={S} fill={`url(#${id}sky)`} />
      {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff" opacity={0.4 + s.s / 3} />)}
      <circle cx={W * 0.82} cy={40} r="16" fill="#fef9c3" />
      <circle cx={W * 0.82 + 7} cy={35} r="14" fill="#0f1233" />
      <path d={`${hill} L${W + 30} ${S} Z`} fill="#141233" />
    </>
  )
}

function Canyon({ W, r, id }) {
  const mesas = (base, color, minW) => {
    const out = []
    for (let x = -20; x < W; ) {
      const w = minW + r() * 60
      const top = base - r() * 45
      out.push(<path key={x} d={`M${x} ${S} L${x + 8} ${top} L${x + w - 8} ${top} L${x + w} ${S} Z`} fill={color} />)
      x += w + r() * 30
    }
    return out
  }
  return (
    <>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fb923c" /><stop offset="1" stopColor="#fef3c7" />
        </linearGradient>
      </defs>
      <rect width={W} height={S} fill={`url(#${id}sky)`} />
      <circle cx={W * 0.2} cy={50} r="20" fill="#fff7ed" opacity="0.9" />
      {mesas(115, '#c2410c', 50)}
      {mesas(150, '#9a3412', 40)}
      <rect y={178} width={W} height={22} fill="#7c2d12" />
    </>
  )
}

const SCENE_ART = { city: City, sunset: Sunset, ocean: Ocean, night: Night, canyon: Canyon }

export default function Mural({ scene = 'city', teams, seed = 1, labels = true, className = '' }) {
  const id = useId().replace(/:/g, '')
  const W = S * Math.max(1, teams.length)
  const Art = SCENE_ART[scene] ?? City
  const at = (i) => (path) => path.map(([x, y]) => `${i * S + S / 2 + x * UNIT},${S / 2 - y * UNIT}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${S}`} className={`mx-auto block w-full rounded-xl ${className}`} style={{ maxWidth: `${teams.length * 20}rem` }} role="img" aria-label="The crew's mural">
      <Art W={W} r={rng(seed + scene.length * 7)} id={id} />
      <rect width={W} height={S} fill="#000" opacity="0.22" />
      {teams.map((t, i) => (
        <g key={i}>
          <clipPath id={`${id}c${i}`}><rect x={i * S} y={0} width={S} height={S} /></clipPath>
          <g clipPath={`url(#${id}c${i})`}>
            {(t.sketch ?? []).map((p, k) => (
              <polyline key={`s${k}`} points={at(i)(p)} fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="3 3" strokeLinecap="round" />
            ))}
            {t.wall.map((piece, k) => piece.map((p, j) => (
              <g key={`${k}-${j}`}>
                <polyline points={at(i)(p)} fill="none" stroke="#0b0710" strokeOpacity="0.7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="spray" />
                <polyline points={at(i)(p)} fill="none" stroke={t.color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="spray" />
              </g>
            )))}
          </g>
          {i > 0 && <line x1={i * S} y1={6} x2={i * S} y2={S - 6} stroke="#fff" strokeOpacity="0.35" strokeDasharray="4 5" />}
          {labels && (
            <g>
              <rect x={i * S + 6} y={6} width={Math.min(S - 12, 14 + t.name.length * 6.4)} height="16" rx="4" fill={t.color} />
              <text x={i * S + 13} y={17.5} fontSize="10" fontFamily="Bungee, sans-serif" fill="#1a0d16">{t.name.length > 26 ? `${t.name.slice(0, 25)}…` : t.name}</text>
            </g>
          )}
        </g>
      ))}
    </svg>
  )
}
