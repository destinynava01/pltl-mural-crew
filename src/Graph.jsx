// The sketch a team works from: a ±10 grid with the piece drawn on it, its labeled key points, the starting point
// of a square-root piece, dashed asymptotes, and the dashed mirror line y = x in the Mirror mural round. The server
// sends the points to draw (never the equation).
import { fmt } from './math'

const U = 10 // svg units per grid unit
const X = (x) => x * U
const Y = (y) => -y * U
const pts = (path) => path.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')

export default function Graph({ graph, color = '#f472b6', ghost = [], className = '' }) {
  if (!graph) return null
  const ticks = Array.from({ length: 21 }, (_, i) => i - 10)
  return (
    <svg viewBox="-106 -106 212 212" className={`block w-full rounded-lg bg-[#fbf7ef] ${className}`} role="img" aria-label="The sketch of the piece on a grid">
      {/* grid */}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={X(t)} y1={-100} x2={X(t)} y2={100} stroke={t === 0 ? '#1f1a2b' : '#d9d2c3'} strokeWidth={t === 0 ? 0.9 : 0.35} />
          <line x1={-100} y1={Y(t)} x2={100} y2={Y(t)} stroke={t === 0 ? '#1f1a2b' : '#d9d2c3'} strokeWidth={t === 0 ? 0.9 : 0.35} />
        </g>
      ))}
      {ticks.filter((t) => t && t % 2 === 0).map((t) => (
        <g key={`n${t}`} fontSize="5.6" fill="#6b6378" fontFamily="Inter, sans-serif">
          <text x={X(t)} y={6} textAnchor="middle">{fmt(t)}</text>
          <text x={-1.6} y={Y(t) + 2} textAnchor="end">{fmt(t)}</text>
        </g>
      ))}
      <text x={101} y={-2} fontSize="6.5" fill="#1f1a2b" textAnchor="end" fontStyle="italic">x</text>
      <text x={2} y={-101} fontSize="6.5" fill="#1f1a2b" dominantBaseline="hanging" fontStyle="italic">y</text>

      {/* guides */}
      {graph.mirror && <line x1={X(-10)} y1={Y(-10)} x2={X(10)} y2={Y(10)} stroke="#0891b2" strokeWidth="0.9" strokeDasharray="3 2" />}
      {graph.mirror && <text x={X(9.6)} y={Y(8.6)} fontSize="6" fill="#0891b2" textAnchor="end">y = x</text>}
      {graph.asymptotes && (
        <g stroke="#7c3aed" strokeWidth="0.8" strokeDasharray="2.5 2">
          <line x1={X(graph.asymptotes.x)} y1={-100} x2={X(graph.asymptotes.x)} y2={100} />
          <line x1={-100} y1={Y(graph.asymptotes.y)} x2={100} y2={Y(graph.asymptotes.y)} />
        </g>
      )}

      {/* earlier paint, faded */}
      {ghost.map((p, i) => <polyline key={`g${i}`} points={pts(p)} fill="none" stroke={color} strokeOpacity="0.25" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />)}

      {/* the piece */}
      {graph.paths.map((p, i) => (
        <polyline key={i} points={pts(p)} fill="none" stroke="#1f1a2b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {graph.paths.map((p, i) => (
        <polyline key={`c${i}`} points={pts(p)} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ))}

      {/* key points */}
      {graph.dots.map((d, i) => {
        const right = d.x > 5
        const below = d.y > 8
        return (
          <g key={`d${i}`}>
            <circle cx={X(d.x)} cy={Y(d.y)} r="1.9" fill={d.open ? '#fbf7ef' : '#1f1a2b'} stroke="#1f1a2b" strokeWidth="0.7" />
            {d.label && (
              <text x={X(d.x) + (right ? -2.6 : 2.6)} y={Y(d.y) + (below ? 8.5 : -3)} fontSize="7" fontWeight="700" fill="#1f1a2b" textAnchor={right ? 'end' : 'start'}
                stroke="#fbf7ef" strokeWidth="2" paintOrder="stroke" fontFamily="Inter, sans-serif">
                ({fmt(d.x)}, {fmt(d.y)})
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
