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

  const cls = url.searchParams.get("class") ?? "";
  const all = await store.list();
  const classes = [...new Set(all.flatMap((x) => x.user_classes))].sort();
  // Each user class has its own ranking; votes without a class form the overall one.
  const matches = (await arena.matches()).filter((m) => m.cls === cls);
  // Elo is always computed over every vote; the filter only narrows what is shown.
  const rated = ratings(
    all.map((x) => x.id),
    matches,
  );
  const stories = all.filter(
    (x) => keep(x.status[version]) && (!cls || x.user_classes.includes(cls)),
  );
  const byId = new Map(stories.map((x) => [x.id, x]));
  const pool = stories.map((x) => rated.get(x.id)!);
  const ids = pool.length >= 2 ? pair(pool) : null;
  return {
    version,
    status,
    cls,
    classes,
    pair: ids ? ids.map((id) => byId.get(id)!) : [],
    ranking: pool
      .toSorted((a, b) => b.elo - a.elo)
      .map((r) => ({ ...r, title: byId.get(r.id)!.title })),
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
        const cls = String(form.get("class") ?? "");
        const byId = new Map((await store.list()).map((s) => [s.id, s]));
        const w = byId.get(winner),
          l = byId.get(loser);
        if (!w || !l || winner === loser) return fail(400);
        if (cls && !(w.user_classes.includes(cls) && l.user_classes.includes(cls)))
          return fail(400);
        await arena.record(winner, loser, cls);
      },
    };
