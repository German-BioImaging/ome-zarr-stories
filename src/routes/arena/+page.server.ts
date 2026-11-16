import { fail } from "@sveltejs/kit";
import { arena, pair, ratings } from "#lib/server/arena.ts";
import { store } from "#lib/server/store.ts";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const stories = await store.list();
  const matches = await arena.matches();
  const rated = [
    ...ratings(
      stories.map((s) => s.id),
      matches,
    ).values(),
  ];
  const byId = new Map(stories.map((s) => [s.id, s]));
  const [a, b] = pair(rated);
  return {
    pair: [byId.get(a)!, byId.get(b)!],
    ranking: rated
      .toSorted((x, y) => y.elo - x.elo)
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
        const ids = new Set((await store.list()).map((s) => s.id));
        if (!ids.has(winner) || !ids.has(loser) || winner === loser)
          return fail(400);
        await arena.record(winner, loser);
      },
    };
