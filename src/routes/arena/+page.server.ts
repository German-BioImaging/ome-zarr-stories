import { fail } from "@sveltejs/kit";
import { arena, pair, ratings } from "#lib/server/arena.ts";
import { store } from "#lib/server/store.ts";
import {
  isSolved,
  LATEST_VERSION,
  SPEC_VERSIONS,
  STATUSES,
} from "#lib/schema.ts";
import type { Actions, PageServerLoad } from "./$types";

// Default: only stories the chosen version doesn't solve yet; '' = any status, or one exact status.
export const load: PageServerLoad = async ({ url }) => {
  const v = url.searchParams.get("v") ?? "";
  const version = SPEC_VERSIONS.includes(v) ? v : LATEST_VERSION;
  const s = url.searchParams.get("status") ?? "open";
  const status = s === "" || s === "open" || STATUSES.includes(s) ? s : "open";
  const keep = (st: string) =>
    status === "open" ? !isSolved(st) : !status || st === status;

  const all = await store.list();
  const matches = await arena.matches();
  // Elo is always computed over every vote; the filter only narrows what is shown.
  const rated = ratings(
    all.map((x) => x.id),
    matches,
  );
  const stories = all.filter((x) => keep(x.status[version]));
  const byId = new Map(stories.map((x) => [x.id, x]));
  const pool = stories.map((x) => rated.get(x.id)!);
  const ids = pool.length >= 2 ? pair(pool) : null;
  return {
    version,
    status,
    pair: ids ? ids.map((id) => byId.get(id)!) : [],
    ranking: pool
      .toSorted((a, b) => b.elo - a.elo)
      .map((r) => ({ ...r, title: byId.get(r.id)!.title })),
    statuses: Object.fromEntries(stories.map((x) => [x.id, x.status[version]])),
    total: matches.length,
  };
};

export const actions: Actions | undefined = __STATIC__
  ? undefined
  : {
      default: async ({ request }) => {
        const form = await request.formData();
        const winner = String(form.get("winner") ?? "");
        const loser = String(form.get("loser") ?? "");
        const ids = new Set((await store.list()).map((s) => s.id));
        if (!ids.has(winner) || !ids.has(loser) || winner === loser)
          return fail(400);
        await arena.record(winner, loser);
      },
    };
