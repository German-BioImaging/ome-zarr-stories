/** Story arena: pick the better of two stories; Elo ratings are replayed from a match log. */

// cls: the user class the vote was made in; "" = overall ranking.
export type Match = { winner: string; loser: string; at: string; cls?: string };
export type Rating = { id: string; elo: number; games: number };

const K = 32;
const START = 1500;

// ponytail: replay the whole log on every read; fine for thousands of matches, cache if it ever gets slow.
export function ratings(ids: string[], matches: Match[]): Map<string, Rating> {
  const r = new Map(ids.map((id) => [id, { id, elo: START, games: 0 }]));
  for (const { winner, loser } of matches) {
    const w = r.get(winner),
      l = r.get(loser);
    if (!w || !l) continue; // story deleted since
    const expected = 1 / (1 + 10 ** ((l.elo - w.elo) / 400));
    w.elo += K * (1 - expected);
    l.elo -= K * (1 - expected);
    w.games++;
    l.games++;
  }
  return r;
}

const pickOne = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Match types from bhl-arena: mostly explore the least-played, sometimes pit top stories against each other or underdogs. */
export function pair(rated: Rating[]): [string, string] {
  if (rated.length < 2) throw new Error("Need at least two stories");
  const byElo = rated.toSorted((a, b) => b.elo - a.elo);
  const top = byElo.slice(0, 20);
  const minGames = Math.min(...rated.map((r) => r.games));
  const fresh = rated.filter((r) => r.games === minGames);
  const roll = Math.random();
  let a: Rating, pool: Rating[];
  if (roll < 0.5)
    [a, pool] = [pickOne(fresh), rated]; // exploratory
  else if (roll < 0.6)
    [a, pool] = [pickOne(fresh), top]; // exploratory challenge
  else if (roll < 0.75)
    [a, pool] = [pickOne(top), top]; // top match
  else if (roll < 0.9)
    [a, pool] = [pickOne(top), byElo.filter((r) => r.elo < START)]; // challenge
  else [a, pool] = [pickOne(rated), rated]; // random
  pool = pool.filter((r) => r.id !== a.id);
  const b = pickOne(pool.length ? pool : rated.filter((r) => r.id !== a.id));
  return Math.random() < 0.5 ? [a.id, b.id] : [b.id, a.id];
}

