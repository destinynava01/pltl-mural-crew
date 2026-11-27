/* eslint-disable react-refresh/only-export-components -- static slide content with small local helpers */
// The "How to play" slides for Mural Crew (shown before the game starts). The art uses the same pieces as the real
// game (posters, the sketch grid, the mural).
import Graph from './Graph'
import Mural from './Mural'

function Panel({ children, className = '' }) {
  return <div className={`paper w-full max-w-sm rounded-xl p-4 text-left text-sm text-ink ${className}`}>{children}</div>
}

// y = −(x − 2)² + 5, drawn the way the server sends it
const parabola = Array.from({ length: 81 }, (_, i) => {
  const x = -2 + i * 0.1
  return [Math.round(x * 100) / 100, Math.round((5 - (x - 2) ** 2) * 100) / 100]
}).filter(([, y]) => y >= -12)
const SAMPLE = { paths: [parabola], dots: [{ x: 2, y: 5, label: true }, { x: 3, y: 4, label: true }], asymptotes: null, mirror: false }
const curve = (f, lo, hi) => [Array.from({ length: 81 }, (_, i) => lo + ((hi - lo) * i) / 80).map((x) => [x, f(x)]).filter(([, y]) => Math.abs(y) < 11)]
const DEMO = [
  { name: 'Team 1', color: '#22d3ee', wall: [curve((x) => (x + 3) ** 2 / 2 - 6, -9, 3), curve((x) => Math.abs(x - 4) + 1, -2, 10)] },
  { name: 'Team 2', color: '#f472b6', wall: [curve((x) => 2 * Math.sqrt(x + 6) - 4, -6, 10)] },
  { name: 'Team 3', color: '#a3e635', wall: [curve((x) => (x - 1) ** 3 / 4 + 2, -5, 7), curve((x) => -Math.abs(x + 2) + 6, -10, 6)] },
]

export const SLIDES = [
  {
    title: 'Paint the wall',
    text: 'Every team owns a section of the crew\'s mural. Each step shows your team a piece sketched on a grid. Get the step right and the piece gets sprayed onto your wall in your team\'s color. Every team gets its own pieces and numbers, so no copying.',
    art: <Mural scene="night" teams={DEMO} className="max-w-xl" />,
  },
  {
    title: 'Place the stencil',
    text: 'The stencils are the toolkit functions: x², x³, |x|, √x, ∛x, 1/x and 1/x². Pick the right one, then set a, h and k (and flip it if it\'s mirrored) until your equation lands on the sketch. Wrong tries tell you what\'s off: too high, too far left, wrong stencil.',
    art: (
      <Panel>
        <div className="mx-auto max-w-[12rem]"><Graph graph={SAMPLE} /></div>
        <p className="mt-3 rounded-lg border border-dashed border-accent/60 px-3 py-2 text-center text-xl font-bold text-accent">y = −(x − 2)² + 5</p>
      </Panel>
    ),
  },
  {
    title: 'One lead painter at a time',
    text: 'Everyone\'s phone shows the sketch and the answer boxes, so everyone can work it out. But one student is the lead painter and sends the team\'s answer. The role moves to the next teammate after every step, so talk it through first.',
    art: (
      <Panel>
        <p className="font-display text-lg text-accent">Read the wall</p>
        <p className="mt-1 text-muted">Give the domain and range in interval notation.</p>
        <p className="mt-2 rounded-lg bg-panel px-3 py-2 text-center text-lg font-bold">Domain (−∞, ∞)</p>
        <p className="mt-1 rounded-lg bg-panel px-3 py-2 text-center text-lg font-bold">Range (−∞, 5]</p>
        <p className="mt-3 rounded-lg bg-accent px-3 py-2 text-center font-display text-on-accent">🎨 Spray it</p>
      </Panel>
    ),
  },
  {
    title: 'The rounds',
    text: 'Place the stencil (transformations, 3.5), Read the wall (domain and range, 3.2), Steep or flat (rate of change, increasing and decreasing, local max and min, 3.3), and Mirror mural (one-to-one and inverses, 3.7).',
    art: (
      <Panel>
        <ol className="space-y-1 text-base">
          <li>🎨 <b>Place the stencil</b></li>
          <li>📏 <b>Read the wall</b></li>
          <li>⛰️ <b>Steep or flat</b></li>
          <li>🪞 <b>Mirror mural</b></li>
        </ol>
      </Panel>
    ),
  },
  {
    title: 'Points',
    text: 'Each step is worth 50 points; every wrong try costs a quarter. Stuck after three tries (two in Jumpstart)? You can see the answer and move on, for 0 points. Every answer goes into your team\'s notes with the reason, so your phone ends up as a study sheet. Finish first for a bonus!',
    art: (
      <Panel>
        <p className="flex justify-between font-display text-lg"><span>🥇 Team 2</span><span className="text-spike">640</span></p>
        <p className="mt-1 flex justify-between font-display text-lg"><span>🥈 Team 1</span><span className="text-spike">585</span></p>
        <p className="mt-4 text-center"><span className="stamp text-xl">Painted</span></p>
      </Panel>
    ),
  },
]

// The guide's own look: a poster on the night wall
export const SKIN = {
  backdrop: 'bg-[#0b0910]/85',
  panel: 'rounded-xl border border-line bg-card text-ink shadow-2xl',
  glow: true,
  label: 'font-display text-sm tracking-[0.15em]',
  skip: 'rounded-lg border border-line bg-panel px-3 py-1 text-sm font-bold text-muted hover:bg-hover',
  art: 'lab-bg rounded-xl',
  step: 'text-sm font-bold uppercase tracking-widest text-muted',
  title: 'font-display text-3xl leading-tight text-accent sm:text-4xl',
  text: 'text-lg leading-relaxed text-ink',
  footer: 'border-t border-line bg-panel',
  check: 'text-sm text-muted',
  back: 'rounded-lg border border-line bg-card px-4 py-2 font-display text-ink hover:bg-hover',
  next: 'rounded-lg bg-accent px-5 py-2 font-display text-lg text-on-accent hover:brightness-110',
  dotOff: '#43395a',
  launcher: 'rounded-lg border border-line bg-card px-4 py-2 font-display text-sm text-accent shadow-lg hover:bg-hover',
}
