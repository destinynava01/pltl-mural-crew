import { useCallback, useEffect, useRef, useState } from 'react'
import HowToPlay from './HowToPlay'
import { SLIDES as HOW_TO_SLIDES } from './howToSlides'
import { mcGame, watchGame } from './api'
import Peek from './Peek'
import Results from './Results'
import Graph from './Graph'
import Mural from './Mural'
import { clockText, roundOf, SCENES, SITE_NAME } from './config'
import { playClosed, playSolved, playWrong, setSoundOn, soundOn } from './sounds'
import { Button, Stamp } from './ui'

// The projector: the crew's mural across the top (one section per team, painted as the team gets each step right),
// then a card per team with its progress, its current sketch and its lead painter. Every team has its own pieces and
// numbers, so showing a team's wall can't help another. The clock counts down at the top; the game ends when it runs
// out or every team finishes.
export default function Board({ session, onLobby, onNewGame }) {
  const [board, setBoard] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sound, setSound] = useState(soundOn)
  const [now, setNow] = useState(() => Date.now())
  const [peek, setPeek] = useState(null) // the team the leader is peeking at
  const last = useRef(null)

  const call = useCallback((payload) => mcGame({ ...payload, game_id: session.gameId, host_token: session.hostToken }), [session])

  // One sound per update, the biggest news first
  const listen = (d) => {
    const events = new Map(d.teams.map((t) => [t.index, t.last_event ?? null]))
    if (last.current) {
      const kinds = new Set()
      for (const [i, e] of events) if (e && e.at !== last.current.get(i)?.at) kinds.add(e.kind)
      if (kinds.has('closed')) playClosed()
      else if (kinds.has('right') || kinds.has('revealed')) playSolved()
      else if (kinds.has('wrong')) playWrong()
    }
    last.current = events
  }

  const load = useCallback(() => call({ action: 'board' }).then((d) => { listen(d); setBoard({ ...d, offset: Date.parse(d.server_now) - Date.now() }); setError('') }).catch((e) => setError(e.message)), [call])
  useEffect(() => {
    load()
    return watchGame(session.gameId, ['state', 'lobby'], load, 5000)
  }, [session, load])
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const left = board?.game.ends_at ? Date.parse(board.game.ends_at) - (now + board.offset) : null
  useEffect(() => { if (left !== null && left <= 0 && board?.game.status === 'playing') load() }, [left, board?.game.status, load])

  async function end() {
    if (!window.confirm('End the game now and see the results?')) return
    setBusy(true)
    try { await call({ action: 'end_game' }); await load() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  if (!board) return <main className="lab-bg flex min-h-dvh items-center justify-center"><p className="font-display text-muted">{error || 'Shaking the spray cans…'}</p></main>
  if (board.game.status === 'finished') return <Results session={session} onNewGame={onNewGame} onLobby={onLobby} />
  const serverNow = now + board.offset

  return (
    <main className="lab-bg min-h-dvh p-4 text-ink sm:p-6">
      <HowToPlay site="mural" gameId={session.gameId} name={SITE_NAME} accent="#f472b6" slides={HOW_TO_SLIDES} autoOpen={!board.game.ends_at}
        note={board.game.ends_at ? 'The clock keeps running while this is open.' : ''} />
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="tag text-sm">join code {session.joinCode}</p>
          <h1 className="mt-2 font-display text-5xl font-bold">🎨 {SITE_NAME}</h1>
          <p className="text-sm text-muted">{SCENES[board.game.scene] ?? ''} · {board.game.rounds.join(' · ')}{board.game.jumpstart ? ' · 🚀 Jumpstart' : ''}{board.game.stretch_x ? ' · ↔️ horizontal stretches' : ''}</p>
        </div>
        {left !== null && (
          <div className={`paper rounded-xl px-5 py-2 text-center ${left < 120000 ? 'shake' : ''}`} key={left < 120000 ? Math.floor(left / 10000) : 'clock'}>
            <p className="font-display text-xs uppercase tracking-[0.3em] text-muted">Clock</p>
            <p className={`font-display text-4xl font-bold ${left < 120000 ? 'text-fire' : 'text-accent'}`}>{clockText(left)}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {board.waiting > 0 && <Button variant="fire" className="!px-4 !py-2 text-sm" onClick={onLobby}>{board.waiting} waiting to join</Button>}
          <Button variant="outline" className="!px-4 !py-2 text-sm" aria-label={sound ? 'Mute sounds' : 'Turn sounds on'} title={sound ? 'Mute sounds' : 'Turn sounds on'}
            onClick={() => { setSoundOn(!sound); setSound(!sound); if (!sound) playSolved() }}>
            {sound ? '🔊' : '🔇'}
          </Button>
          <Button variant="outline" className="!px-4 !py-2 text-sm" onClick={onLobby}>Lobby</Button>
          <Button variant="fire" className="!px-4 !py-2 text-sm" disabled={busy} onClick={end}>End game</Button>
        </div>
      </header>
      {error && <p className="mx-auto mt-3 max-w-7xl rounded-lg bg-bad-soft px-3 py-2 font-bold text-bad">{error}</p>}

      {/* Each row of the wall, with every team's card right under its own section */}
      <section className="mt-6 space-y-8">
        {rows(board.teams).map((row, r) => (
          <div key={r} className="mx-auto" style={{ maxWidth: `${row.length * 20}rem` }}>
            <Mural scene={board.game.scene} seed={r + 1} className="shadow-2xl"
              teams={row.map((t) => ({ name: t.name, color: t.color, wall: t.case?.file.wall ?? [], sketch: t.case && !t.case.finished ? t.case.file.current?.graph.paths : [] }))} />
            <div className="mt-5 grid gap-2" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
              {row.map((t) => <TeamCard key={t.index} team={t} serverNow={serverNow} onPeek={() => setPeek({ index: t.index, name: t.name })} />)}
            </div>
          </div>
        ))}
      </section>
      {peek && <Peek call={call} team={{ ...peek, color: board.teams[peek.index]?.color }} stamp={board} onClose={() => setPeek(null)} />}
    </main>
  )
}


// Up to 4 sections per row of the wall (5 teams: 3 + 2, so neither row is a sliver)
function rows(teams) {
  if (teams.length <= 4) return [teams]
  const first = Math.ceil(teams.length / 2)
  return [teams.slice(0, first), teams.slice(first)]
}

function TeamCard({ team, serverNow, onPeek }) {
  const c = team.case
  if (!c) return null
  const f = c.file
  const e = team.last_event
  const fresh = e && serverNow - Date.parse(e.at) < 6000
  const medal = ['🥇', '🥈', '🥉']
  const cur = f.current
  return (
    <article className={`paper pinned rounded-xl ${fresh && e.kind === 'wrong' ? 'shake' : ''}`} key={fresh && e.kind === 'wrong' ? e.at : 'card'}>
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 pb-3 pt-4">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl" style={{ color: team.color }}>{team.name}</h2>
          <p className="truncate text-sm text-muted">{team.members.join(', ')}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl text-spike">{c.points}</p>
          <p className="text-sm text-muted">points</p>
        </div>
      </div>

      <div className="px-4 pt-3">
        <ol className="flex flex-wrap gap-1.5">
          {f.rounds.map((r) => {
            const meta = roundOf(r.id)
            const done = r.done === r.steps
            const now = !c.finished && cur?.round === r.id
            return (
              <li key={r.id} title={meta.title} className={`rounded-md px-2 py-1 text-xs font-bold ${done ? 'bg-ok-soft text-ok' : now ? 'bg-accent-soft text-accent' : 'bg-panel text-muted'}`}>
                {meta.emoji} {r.done}/{r.steps}
              </li>
            )
          })}
        </ol>
        <div className="mt-3">
          {c.finished ? (
            <p className="py-10 text-center"><Stamp className="text-2xl">{medal[c.finish_rank - 1] ?? ''} Wall painted</Stamp></p>
          ) : cur ? (
            <div className="mx-auto max-w-[13rem]"><Graph graph={cur.graph} color={team.color} /></div>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-4 pt-3">
        {!c.finished && cur && (
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 text-sm">🎨 <b>{cur.title}</b> · lead: <b>{team.lead ?? '…'}</b>{c.misses ? <span className="text-bad"> · {c.misses} wrong</span> : ''}</p>
            <button type="button" onClick={onPeek} className="shrink-0 rounded-md border border-line bg-panel px-2 py-1 text-xs font-bold text-accent hover:bg-hover" aria-label={`Peek at ${team.name}`}>👀 Peek</button>
          </div>
        )}
        {fresh && !c.finished && (
          <p className={`pop mt-2 rounded-md px-3 py-2 text-sm font-semibold ${e.kind === 'wrong' ? 'bg-bad-soft text-bad' : e.kind === 'revealed' ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'}`} key={e.at}>
            {e.kind === 'wrong' && `❌ ${e.by}'s answer didn't land`}
            {e.kind === 'right' && `✅ ${e.by} painted it!`}
            {e.kind === 'revealed' && `📂 ${e.by} asked to see the answer`}
          </p>
        )}
      </div>
    </article>
  )
}
