import { useCallback, useEffect, useRef, useState } from 'react'
import { mcPlay, watchGame } from './api'
import Graph from './Graph'
import Mural from './Mural'
import { clockText, roundOf, SITE_NAME, STENCILS } from './config'
import { formatBuilt, intervalsText } from './math'
import { playClosed, playSolved, playWrong } from './sounds'
import { Button, CenterCard, Label, Paper, Stamp } from './ui'

const STORAGE_KEY = 'muralStudent'
const DEVICE_KEY = 'muralDevice'
const field = 'w-full rounded-lg border border-line bg-panel px-4 py-3 text-center text-xl font-bold text-ink outline-none focus:border-accent'

function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id) }
    return id
  } catch {
    return crypto.randomUUID()
  }
}
const readSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null } }
const writeSaved = (v) => { try { v ? localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) : localStorage.removeItem(STORAGE_KEY) } catch { /* blocked */ } }

// The phone: join, wait for a team, then work through the run. Everyone sees the sketch and can work it out on
// their own phone; the lead painter (it rotates every step) sends the team's answer.
export default function StudentJoin() {
  const [saved, setSaved] = useState(readSaved)
  const [notice, setNotice] = useState('')
  const leave = useCallback((message = '') => { writeSaved(null); setSaved(null); setNotice(message) }, [])
  return saved ? <Room saved={saved} onLeave={leave} /> : <JoinForm notice={notice} onJoined={(v) => { writeSaved(v); setSaved(v); setNotice('') }} />
}

function JoinForm({ onJoined, notice }) {
  const [code, setCode] = useState(() => (new URLSearchParams(window.location.search).get('code') ?? '').toUpperCase())
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function join(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const d = await mcPlay({ action: 'join', join_code: code, display_name: name, device_id: deviceId() })
      onJoined({ playerId: d.player.id, gameId: d.game.id })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <CenterCard title={SITE_NAME}>
      <p className="mt-2 text-muted">Grab a spray can. Your crew is waiting.</p>
      <form onSubmit={join} className="mt-4 space-y-4">
        {notice && <p className="font-bold text-muted">{notice}</p>}
        <div>
          <Label>Game code</Label>
          <input className={`${field} mt-2 uppercase tracking-[0.4em]`} maxLength={6} placeholder="ABC123" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required autoCapitalize="characters" autoComplete="off" />
        </div>
        <div>
          <Label>Your name</Label>
          <input className={`${field} mt-2`} maxLength={40} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <Button className="w-full" disabled={busy || code.length < 6 || !name.trim()}>{busy ? 'Joining…' : 'Join'}</Button>
        {error && <p className="font-bold text-bad">{error}</p>}
      </form>
    </CenterCard>
  )
}

function Room({ saved, onLeave }) {
  const [view, setView] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(null) // { kind: 'right' | 'wrong' | 'closed' | 'info', text, at }
  const [now, setNow] = useState(() => Date.now())
  const lastEvent = useRef(null)
  const ownPlay = useRef(false)
  const stamp = useRef(0)
  const say = (kind, text) => { stamp.current += 1; setFlash({ kind, text, at: stamp.current }) }

  const check = useCallback(() => mcPlay({ action: 'status', player_id: saved.playerId, device_id: deviceId() })
    .then((d) => {
      if (d.ended) return onLeave('That game has ended. Join another with a new code.')
      // A teammate (the lead) answered: sounds for everyone, a note when it wasn't this phone
      const e = d.last_event
      if (e && lastEvent.current && e.at !== lastEvent.current) {
        if (e.kind === 'closed') playClosed()
        else if (e.kind === 'wrong') playWrong()
        else playSolved()
        if (!ownPlay.current && !e.mine) {
          if (e.kind === 'wrong') say('wrong', `🔍 ${e.by}'s answer didn't land. Look again together.`)
          else if (e.kind === 'closed') say('closed', '🎉 Your wall is painted!')
          else say('right', `✅ ${e.by} painted it. On to the next piece!`)
        }
      }
      ownPlay.current = false
      lastEvent.current = e?.at ?? lastEvent.current ?? 'none'
      setView({ ...d, offset: Date.parse(d.server_now) - Date.now() })
      setError('')
    })
    .catch((err) => {
      if (/not found|another phone/i.test(err.message)) return onLeave('You were removed from that game.')
      setError(err.message)
    }), [saved, onLeave])

  useEffect(() => {
    check()
    return watchGame(saved.gameId, ['state', 'lobby'], check, 5000)
  }, [saved, check])
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])

  async function send(action, answer) {
    setBusy(true)
    setError('')
    try {
      ownPlay.current = true
      const r = await mcPlay({ action, player_id: saved.playerId, device_id: deviceId(), step: view.case.step, answer })
      if (r.closed) say('closed', `🎉 ${r.feedback} Your wall is painted${r.rank ? ` (#${r.rank} to finish)` : ''}!`)
      else if (r.revealed) say('info', `📂 ${r.feedback}`)
      else if (r.correct) say('right', `✅ ${r.feedback} +${r.points}`)
      else say('wrong', `❌ ${r.feedback}${r.can_reveal ? ' (You can ask to see the answer now.)' : ''}`)
      await check()
    } catch (e) {
      ownPlay.current = false
      setError(e.message)
      check()
    } finally {
      setBusy(false)
    }
  }

  if (!view) return <CenterCard title={SITE_NAME}><p className="mt-4 text-muted">{error || 'Connecting…'}</p></CenterCard>
  const { player, teams } = view
  const myTeam = teams[player.team_index]
  const c = view.case
  const left = view.game.ends_at ? Date.parse(view.game.ends_at) - (now + view.offset) : null
  let body

  if (player.approval_status !== 'approved') body = <Note title="Almost in!" text="Your leader will put you on a crew in a moment." />
  else if (view.game.status === 'setup') body = <Note title={`You're on ${myTeam?.name ?? 'a crew'}`} text="The game starts soon. Grab some scratch paper for sketching pieces and working out rates of change, and watch the projector." />
  else if (!c) body = <Note title="Shaking the spray cans…" text="" />
  else if (view.game.status === 'finished' || c.finished) {
    body = (
      <>
        <Paper className="text-center">
          {c.finished ? <Stamp className="text-3xl">Wall painted</Stamp> : <p className="font-display text-2xl">Time&apos;s up!</p>}
          <p className="mt-4 font-display text-xl">{myTeam?.name}: {c.points} points</p>
          <p className="mt-1 text-muted">{c.solved.length} of {c.steps} steps{c.finish_rank ? ` · #${c.finish_rank} to finish` : ''}</p>
        </Paper>
        <MyWall c={c} team={myTeam} scene={view.game.scene} />
        <Notes c={c} />
      </>
    )
  } else {
    body = (
      <>
        <RoundProgress f={c.file} />
        <Task key={c.step} c={c} color={myTeam?.color} lead={view.lead} busy={busy} canReveal={view.can_reveal} onAnswer={(a) => send('answer', a)} onReveal={() => send('reveal')} />
        <MyWall c={c} team={myTeam} scene={view.game.scene} />
        <Notes c={c} />
      </>
    )
  }

  return (
    <main className="lab-bg min-h-dvh text-ink">
      <div className="mx-auto max-w-md space-y-4 p-4">
        <header className="flex items-center justify-between gap-2 rounded-xl border border-line bg-card/90 px-3 py-2 shadow">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{player.display_name}</p>
            {myTeam && <p className="text-sm text-muted"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: myTeam.color }} />{myTeam.name}</p>}
          </div>
          <div className="text-right">
            {left !== null && view.game.status === 'playing' && <p className={`font-display text-xl ${left < 120000 ? 'text-fire' : ''}`}>⏱ {clockText(left)}</p>}
            {c && <p className="font-display text-sm text-spike">{c.points} pts</p>}
          </div>
        </header>
        {flash && (
          <p key={flash.at} className={`pop rounded-xl px-4 py-3 font-semibold shadow ${flash.kind === 'wrong' ? 'shake bg-bad-soft text-bad' : flash.kind === 'info' ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'}`}>{flash.text}</p>
        )}
        {body}
        {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-center font-bold text-bad">{error}</p>}
        <p className="text-center"><button onClick={() => onLeave()} className="text-sm text-muted hover:text-ink">Leave game</button></p>
      </div>
    </main>
  )
}

function RoundProgress({ f }) {
  return (
    <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${f.rounds.length}, minmax(0, 1fr))` }}>
      {f.rounds.map((r) => {
        const meta = roundOf(r.id)
        const done = r.done === r.steps
        const now = f.current?.round === r.id
        return (
          <li key={r.id} className={`rounded-lg px-1 py-1.5 text-center text-xs font-bold shadow ${done ? 'bg-ok-soft text-ok' : now ? 'bg-accent-soft text-accent' : 'bg-card/70 text-muted'}`}>
            <span className="block text-lg">{done ? '✓' : meta.emoji}</span>{r.done}/{r.steps}
          </li>
        )
      })}
    </ol>
  )
}

const box = 'w-full min-w-0 rounded-lg border border-line bg-panel px-2 py-2 text-center text-lg font-bold text-ink outline-none focus:border-accent'
const chip = (on) => `rounded-lg border px-2 py-2 text-center font-bold transition ${on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-panel hover:bg-hover'}`
const filled = (v) => String(v ?? '').trim() !== ''
const cleanMinus = (v) => v.replace(/[−–]/g, '-')

// A number box that takes negatives and fractions ("-3", "1/2")
function Num({ value, onChange, label, placeholder = '', className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1 block text-xs font-bold text-muted">{label}</span>}
      <input className={box} value={value} placeholder={placeholder} inputMode="text" autoComplete="off" autoCorrect="off" spellCheck={false}
        onChange={(e) => onChange(cleanMinus(e.target.value))} />
    </label>
  )
}

// The current step: the sketch, the question, the answer inputs for its kind, and (for the lead) the send button
function Task({ c, color, lead, busy, canReveal, onAnswer, onReveal }) {
  const cur = c.file.current
  const [answer, setAnswer] = useState(() => blank(cur.kind))
  const isLead = lead?.me
  const round = roundOf(cur.round)
  const set = (patch) => setAnswer({ ...answer, ...patch })
  return (
    <Paper>
      <Label>{round.emoji} {round.title} · step {c.step + 1} of {c.steps}</Label>
      <h2 className="mt-1 font-display text-xl text-accent">{cur.title}</h2>
      <div className="mt-3"><Graph graph={cur.graph} color={color} /></div>
      <p className="mt-3 font-semibold">{cur.prompt}</p>
      {cur.worked && <p className="mt-2 rounded-lg border border-info/40 bg-info/10 px-3 py-2 text-sm">🚀 <b>Start here:</b> {cur.worked}</p>}
      {cur.hint && <p className="mt-2 rounded-lg border border-warn/40 bg-warn-soft px-3 py-2 text-sm text-warn">💡 <b>Hint:</b> {cur.hint}</p>}

      <div className="mt-4">
        {cur.kind === 'build' && <BuildInput value={answer.piece} stretchX={c.file.stretchX} onChange={(piece) => set({ piece })} />}
        {cur.kind === 'intervals' && (
          <div className="space-y-4">
            <IntervalSet label="Domain (x-values)" value={answer.domain} onChange={(domain) => set({ domain })} />
            <IntervalSet label="Range (y-values)" value={answer.range} onChange={(range) => set({ range })} />
          </div>
        )}
        {cur.kind === 'interval' && <IntervalSet label="Interval (x-values)" value={answer.interval} onChange={(interval) => set({ interval })} max={1} />}
        {cur.kind === 'number' && <Num label="Average rate of change" placeholder="like 3 or -1/2" value={answer.number} onChange={(number) => set({ number })} />}
        {cur.kind === 'point' && <PointInput x={answer.x} y={answer.y} onChange={set} />}
        {cur.kind === 'yesno' && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={chip(answer.yes === true)} onClick={() => set({ yes: true })}>Yes, one-to-one</button>
            <button type="button" className={chip(answer.yes === false)} onClick={() => set({ yes: false })}>No</button>
          </div>
        )}
        {cur.kind === 'extremum' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              {[['max', '⛰️ Local max'], ['min', '🏞️ Local min'], ['none', 'Neither']].map(([k, text]) => (
                <button key={k} type="button" className={chip(answer.kind === k)} onClick={() => set({ kind: k })}>{text}</button>
              ))}
            </div>
            {answer.kind && answer.kind !== 'none' && <PointInput label="Where is it?" x={answer.x} y={answer.y} onChange={set} />}
          </div>
        )}
      </div>

      {isLead && <Button className="mt-4 w-full" disabled={busy || !ready(cur.kind, answer)} onClick={() => onAnswer(answer)}>{busy ? 'Checking…' : '🎨 Spray it'}</Button>}
      <div className="mt-4 rounded-lg bg-panel px-3 py-2 text-sm">
        {isLead
          ? <p className="font-bold text-accent">🎨 You&apos;re the lead painter for this step. Talk it through with your crew, then send the answer.</p>
          : <p>🎨 <b>{lead?.name ?? 'Your teammate'}</b> is the lead painter for this step. Work it out here too and help out loud: only the lead&apos;s answer counts.</p>}
        {c.misses > 0 && <p className="mt-1 text-bad">{c.misses} wrong tr{c.misses === 1 ? 'y' : 'ies'} on this step (each costs a quarter of its points).</p>}
      </div>
      {isLead && canReveal && (
        <button type="button" disabled={busy} onClick={() => window.confirm('Show the answer? This step scores 0, but your team moves on.') && onReveal()} className="mt-3 w-full text-sm font-bold text-warn underline">
          Stuck? Show us the answer (0 points for this step)
        </button>
      )}
    </Paper>
  )
}

const emptyInterval = () => ({ lo: '', loC: false, hi: '', hiC: false })
function blank(kind) {
  switch (kind) {
    case 'build': return { piece: { stencil: '', a: '', h: '', k: '', flipY: false, sx: 1 } }
    case 'intervals': return { domain: [emptyInterval()], range: [emptyInterval()] }
    case 'interval': return { interval: [emptyInterval()] }
    case 'number': return { number: '' }
    case 'point': return { x: '', y: '' }
    case 'extremum': return { kind: '', x: '', y: '' }
    default: return {}
  }
}
function ready(kind, a) {
  const full = (list) => list.length > 0 && list.every((i) => filled(i.lo) && filled(i.hi))
  switch (kind) {
    case 'build': return Boolean(a.piece.stencil) && formatBuilt(a.piece).startsWith('y =')
    case 'intervals': return full(a.domain) && full(a.range)
    case 'interval': return full(a.interval)
    case 'number': return filled(a.number)
    case 'point': return filled(a.x) && filled(a.y)
    case 'extremum': return a.kind === 'none' || (Boolean(a.kind) && filled(a.x) && filled(a.y))
    case 'yesno': return a.yes === true || a.yes === false
    default: return false
  }
}

// Pick the stencil, then a, h, k (y = a·f(x − h) + k), a sideways flip, and (when the leader turned it on) a sideways stretch
function BuildInput({ value, stretchX, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch })
  return (
    <div className="space-y-3">
      <div>
        <Label>Stencil</Label>
        <div className="mt-1 grid grid-cols-4 gap-1.5">
          {STENCILS.map((st) => <button key={st.id} type="button" className={`${chip(value.stencil === st.id)} text-lg`} onClick={() => set({ stencil: st.id })}>{st.label}</button>)}
        </div>
      </div>
      <p className="rounded-lg bg-panel px-3 py-1.5 text-center text-sm text-muted">y = <b className="text-ink">a</b> · stencil(x − <b className="text-ink">h</b>) + <b className="text-ink">k</b></p>
      <div className="grid grid-cols-3 gap-2">
        <Num label="a (stretch, flip)" placeholder="1" value={value.a} onChange={(a) => set({ a })} />
        <Num label="h (right is +)" placeholder="0" value={value.h} onChange={(h) => set({ h })} />
        <Num label="k (up is +)" placeholder="0" value={value.k} onChange={(k) => set({ k })} />
      </div>
      <label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${value.flipY ? 'border-accent bg-accent-soft' : 'border-line bg-panel'}`}>
        <input type="checkbox" checked={value.flipY} onChange={(e) => set({ flipY: e.target.checked })} className="h-4 w-4 accent-pink-400" />
        <span><b>Flip sideways</b> (across the y-axis: x becomes −x)</span>
      </label>
      {stretchX && (
        <div>
          <Label>Sideways</Label>
          <div className="mt-1 grid grid-cols-3 gap-1.5 text-sm">
            {[[1, 'No change'], [2, 'Squeeze: 2x'], [0.5, 'Stretch: x/2']].map(([v, text]) => (
              <button key={v} type="button" className={chip(Number(value.sx) === v)} onClick={() => set({ sx: v })}>{text}</button>
            ))}
          </div>
        </div>
      )}
      <p className="rounded-lg border border-dashed border-accent/60 px-3 py-2 text-center text-xl font-bold text-accent">{formatBuilt(value)}</p>
    </div>
  )
}

// One or two intervals joined with ∪. Each end is a number or ±∞, and ( or [ (∞ always gets a parenthesis).
function IntervalSet({ label, value, onChange, max = 2 }) {
  const put = (i, patch) => onChange(value.map((v, k) => (k === i ? { ...v, ...patch } : v)))
  const bracket = 'h-11 w-9 shrink-0 rounded-lg border border-line bg-panel text-2xl font-bold disabled:opacity-50'
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 space-y-2">
        {value.map((iv, i) => {
          const loInf = iv.lo === '-inf', hiInf = iv.hi === 'inf'
          return (
            <div key={i}>
              {i > 0 && <p className="mb-1 text-center text-2xl font-bold text-accent">∪</p>}
              <div className="flex items-start gap-1">
                <button type="button" aria-label="Left bracket: tap to switch" disabled={loInf} onClick={() => put(i, { loC: !iv.loC })} className={bracket}>{iv.loC && !loInf ? '[' : '('}</button>
                <End inf={loInf} sign="−∞" value={iv.lo} onChange={(lo) => put(i, { lo })} onInf={() => put(i, { lo: loInf ? '' : '-inf', loC: false })} />
                <span className="pt-2 text-xl font-bold">,</span>
                <End inf={hiInf} sign="∞" value={iv.hi} onChange={(hi) => put(i, { hi })} onInf={() => put(i, { hi: hiInf ? '' : 'inf', hiC: false })} />
                <button type="button" aria-label="Right bracket: tap to switch" disabled={hiInf} onClick={() => put(i, { hiC: !iv.hiC })} className={bracket}>{iv.hiC && !hiInf ? ']' : ')'}</button>
                {value.length > 1 && <button type="button" aria-label="Remove this interval" onClick={() => onChange(value.filter((_, k) => k !== i))} className="h-11 shrink-0 px-1 text-muted hover:text-bad">✕</button>}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted">Tap a bracket to switch ( and [. Reads: <b className="text-ink">{intervalsText(value.map((v) => ({ ...v, lo: v.lo || '?', hi: v.hi || '?' })))}</b></p>
        {value.length < max && <button type="button" onClick={() => onChange([...value, emptyInterval()])} className="shrink-0 rounded-md border border-line bg-panel px-2 py-1 text-xs font-bold text-accent">+ ∪ another</button>}
      </div>
    </div>
  )
}

function End({ inf, sign, value, onChange, onInf }) {
  return (
    <div className="min-w-0 flex-1">
      {inf
        ? <p className={box}>{sign}</p>
        : <input className={box} value={value} inputMode="text" autoComplete="off" spellCheck={false} placeholder="#" aria-label={sign === '∞' ? 'Right end' : 'Left end'} onChange={(e) => onChange(cleanMinus(e.target.value))} />}
      <button type="button" onClick={onInf} className={`mt-1 w-full rounded-md border px-1 py-0.5 text-xs font-bold ${inf ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-panel text-muted'}`}>{inf ? 'type a number' : sign}</button>
    </div>
  )
}

function PointInput({ x, y, onChange, label = 'The point' }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex items-end gap-1 text-2xl font-bold">
        <span className="pb-2">(</span><Num className="flex-1" placeholder="x" value={x} onChange={(v) => onChange({ x: v })} />
        <span className="pb-2">,</span><Num className="flex-1" placeholder="y" value={y} onChange={(v) => onChange({ y: v })} /><span className="pb-2">)</span>
      </div>
    </div>
  )
}

// The team's own section of the mural, as it stands
function MyWall({ c, team, scene }) {
  if (!c.file.wall.length || !team) return null
  return (
    <Paper pinned={false} className="!p-3">
      <Label className="mb-2">Your wall · {c.file.wall.length} piece{c.file.wall.length === 1 ? '' : 's'}</Label>
      <Mural scene={scene} teams={[{ name: team.name, color: team.color, wall: c.file.wall }]} labels={false} />
    </Paper>
  )
}

// Every solved step: the answer and why (a study sheet that builds up as the team plays)
function Notes({ c }) {
  const notes = c.file.notes
  if (!notes.length) return null
  return (
    <Paper pinned={false}>
      <Label>Your notes</Label>
      <ol className="mt-2 space-y-2 text-sm">
        {[...notes].reverse().map((n) => (
          <li key={n.step} className="rounded-lg bg-panel px-3 py-2">
            <p className="font-bold">{roundOf(n.round).emoji} {n.title}: <span className="text-accent">{n.answer}</span></p>
            <p className="mt-0.5 text-muted">{n.explain}</p>
          </li>
        ))}
      </ol>
    </Paper>
  )
}

function Note({ title, text }) {
  return (
    <Paper className="text-center">
      <h2 className="font-display text-2xl text-accent">{title}</h2>
      {text && <p className="mt-2 text-muted">{text}</p>}
    </Paper>
  )
}
