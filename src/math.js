// Small math helpers for the phones and the leader's screens: turning a student's answer into readable text (the
// live equation preview while building, and the tries list in the peek). The server does all the checking.
import { STENCILS } from './config'

const close = (x, y) => Math.abs(x - y) < 1e-9 * Math.max(1, Math.abs(x), Math.abs(y))

// "3", "-2.5", "1/2", "−3/4" -> number, or null
export function parseNum(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (typeof raw !== 'string') return null
  const s = raw.trim().replace(/[−–]/g, '-').replace(/\s+/g, '')
  if (!s) return null
  const frac = s.match(/^([+-]?\d+(?:\.\d+)?)\/([+-]?\d+(?:\.\d+)?)$/)
  if (frac) return Number(frac[2]) === 0 ? null : Number(frac[1]) / Number(frac[2])
  return /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s) ? Number(s) : null
}

export function fmt(n) {
  const sign = n < 0 ? '−' : ''
  const v = Math.abs(n)
  if (close(v, Math.round(v))) return sign + String(Math.round(v))
  for (const d of [2, 3, 4, 8, 9, 16, 27]) if (close(v * d, Math.round(v * d))) return `${sign}${Math.round(v * d)}/${d}`
  return sign + String(Math.round(v * 1000) / 1000)
}

// A builder answer { stencil, a, h, k, flipY, sx } as an equation (the same way the server writes them)
export function formatBuilt(b) {
  if (!b?.stencil) return 'Pick a stencil'
  const a = b.a === '' || b.a === undefined ? 1 : parseNum(b.a)
  const h = b.h === '' || b.h === undefined ? 0 : parseNum(b.h)
  const k = b.k === '' || b.k === undefined ? 0 : parseNum(b.k)
  if (a === null || h === null || k === null) return 'Check the numbers'
  if (a === 0) return 'a can’t be 0'
  const bb = (b.flipY ? -1 : 1) * (Number(b.sx) || 1)
  const u = h === 0 ? 'x' : h > 0 ? `x − ${fmt(h)}` : `x + ${fmt(-h)}`
  let inner
  if (bb === 1) inner = u
  else if (bb === -1) inner = u === 'x' ? '−x' : `−(${u})`
  else {
    const bs = fmt(bb)
    const coef = bs.includes('/') ? `(${bs})` : bs
    inner = u === 'x' ? `${coef}x` : `${coef}(${u})`
  }
  const grouped = inner === 'x' ? 'x' : `(${inner})`
  const coefA = a === 1 ? '' : a === -1 ? '−' : fmt(a).includes('/') ? `(${fmt(a)})` : fmt(a)
  const wrap = (t) => (t === 'x' ? t : `(${t})`)
  let body
  switch (b.stencil) {
    case 'sq': body = `${coefA}${grouped}²`; break
    case 'cube': body = `${coefA}${grouped}³`; break
    case 'abs': body = `${coefA}|${inner}|`; break
    case 'sqrt': body = `${coefA}√${wrap(inner)}`; break
    case 'cbrt': body = `${coefA}∛${wrap(inner)}`; break
    case 'recip': body = `${a < 0 ? '−' : ''}${fmt(Math.abs(a))}/${grouped}`; break
    case 'recip2': body = `${a < 0 ? '−' : ''}${fmt(Math.abs(a))}/${grouped}²`; break
    default: return 'Pick a stencil'
  }
  const kk = k === 0 ? '' : k > 0 ? ` + ${fmt(k)}` : ` − ${fmt(-k)}`
  return `y = ${body}${kk}`
}

// [{ lo, loC, hi, hiC }] (strings) -> "[2, ∞) ∪ (−∞, 0)"
export function intervalsText(set) {
  if (!Array.isArray(set) || !set.length) return '—'
  const end = (v, inf) => (typeof v === 'string' && /inf/i.test(v) ? inf : String(v).replace('-', '−'))
  return set.map((i) => {
    const loInf = /inf/i.test(String(i.lo)), hiInf = /inf/i.test(String(i.hi))
    return `${loInf || !i.loC ? '(' : '['}${end(i.lo, '−∞')}, ${end(i.hi, '∞')}${hiInf || !i.hiC ? ')' : ']'}`
  }).join(' ∪ ')
}

// Any answer a phone sent, as one line of text
export function describeAnswer(kind, a = {}) {
  switch (kind) {
    case 'build': return formatBuilt(a.piece)
    case 'intervals': return `Domain ${intervalsText(a.domain)} · Range ${intervalsText(a.range)}`
    case 'interval': return intervalsText(a.interval)
    case 'number': return String(a.number ?? '')
    case 'extremum': return a.kind === 'none' ? 'Neither' : `Local ${a.kind === 'min' ? 'minimum' : 'maximum'} at (${a.x ?? '?'}, ${a.y ?? '?'})`
    case 'yesno': return a.yes ? 'Yes, one-to-one' : 'No, not one-to-one'
    case 'point': return `(${a.x ?? '?'}, ${a.y ?? '?'})`
    default: return JSON.stringify(a)
  }
}

export const stencilLabel = (id) => STENCILS.find((s) => s.id === id)?.label ?? id
