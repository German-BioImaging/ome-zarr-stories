import { fail } from "@sveltejs/kit";
import { arena } from "#lib/server/arena.ts";
import { store } from "#lib/server/store.ts";
import type { Actions, PageServerLoad } from "./$types";

// Filtering, Elo and pairing happen in the page, so the same code runs on the static site.
export const load: PageServerLoad = async () => ({
  stories: await store.list(),
  matches: await arena.matches(),
});

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
        const key = /^RFC-\d+$/.test(cls) ? "rfcs" : "user_classes";
        if (cls && !(w[key].includes(cls) && l[key].includes(cls)))
          return fail(400);
        await arena.record(winner, loser, cls);
      },
    };
