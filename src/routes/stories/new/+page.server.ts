import { fail, redirect } from '@sveltejs/kit';
import { blankCells, cellsFromForm, nextId, today } from '#lib/schema.ts';
import { store } from '#lib/server/store.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const stories = await store.list();
	return { values: { ...blankCells(today()), id: nextId(stories) }, stories };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const cells = { ...blankCells(today()), ...cellsFromForm(await request.formData()) };
		const result = await store.create(cells);
		if (result.status !== 'ok') {
			return fail(400, { values: cells, errors: result.status === 'invalid' ? result.errors : {} });
		}
		redirect(303, `/stories/${result.story.id}`);
	}
};
