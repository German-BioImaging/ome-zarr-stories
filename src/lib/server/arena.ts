/** Match log on disk; the Elo maths and pairing live in #lib/arena.ts (shared with the static site). */
import { appendFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Match } from "#lib/arena.ts";
export { pair, ratings, type Match, type Rating } from "#lib/arena.ts";

export function createArena(path: string) {
  return {
    async matches(): Promise<Match[]> {
      const text = await readFile(path, "utf-8").catch(() => "");
      return text
        .split("\n")
        .slice(1)
        .filter(Boolean)
        .map((line) => {
          const [winner, loser, at, cls = ""] = line.split("\t");
          return { winner, loser, at, cls };
        });
    },
    async record(winner: string, loser: string, cls = "") {
      const text = await readFile(path, "utf-8").catch(() => "");
      const header = text ? "" : "winner\tloser\tat\tclass\n";
      await appendFile(
        path,
        `${header}${winner}\t${loser}\t${new Date().toISOString()}\t${cls}\n`,
        "utf-8",
      );
    },
  };
}

export const arena = createArena(
  resolve(process.env.ARENA_FILE ?? "arena-matches.tsv"),
);
