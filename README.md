# Mural Crew

A PLTL College Algebra game (Shape Shifter): paint the crew's mural, one stencil at a time. The projector shows one
mural with a different scene every game (city skyline, sunset, ocean, starry night or desert canyon). Each team owns
a section of the wall. Each team gets its own run through the rounds the leader picks, with pieces and numbers
generated for that team:

1. **Place the stencil (3.5):** pick the toolkit function (x², x³, |x|, √x, ∛x, 1/x, 1/x²) and set a, h and k (plus
   a flip across the y-axis) so the equation matches the sketch. Wrong tries say what's off: too high, too far
   left, wrong stencil.
2. **Read the wall (3.2):** domain and range in interval notation, with brackets, ±∞ and ∪.
3. **Steep or flat (3.3):** average rate of change between two marked points, where the piece is increasing or
   decreasing, and its local maximum or minimum (or neither).
4. **Mirror mural (3.7):** is the piece one-to-one, mirror a point across y = x, and build the inverse.

Every right answer sprays the piece onto the team's wall in the team's color, on the projector and on the phones.
One student per team is the **lead painter** and sends each answer; the role rotates every step. Each step is worth
50 points, minus a quarter per wrong try. After three wrong tries the team can see the answer and move on (0 points).
Solved steps build up as study notes with the reason for each answer. Optional clock (20, 30 or 45 minutes).

Lobby options:
- **Jumpstart:** friendlier numbers (no stretches), a worked first step on every question, a stronger hint after
  one wrong try, and the answer offered after two.
- **Horizontal stretches:** off by default (and always off in Jumpstart). Some pieces get squeezed or stretched
  sideways, like y = (2x)².

The leader can **peek** at any team: its sketch, the lead painter, every answer tried on the step, and the answer
(behind a button). Results can be downloaded as an Excel file.

## Pages

| Path | Who | What |
|---|---|---|
| `/` | Leader | Lobby (teams, rounds, clock, options), then the projector (the mural and every team's card) and results |
| `/join` | Students | Join with the code, work from the team's sketch, answer when you're the lead painter |

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the shared PLTL Supabase project's URL and publishable key.
3. `npm run dev`

The backend lives in the `supabase-backend` repository: the tables `mc_*`, the functions `mc-game` and `mc-play`,
and the rules in `_shared/muralCrew.ts` (tests in `_shared/muralCrew_test.ts`).
