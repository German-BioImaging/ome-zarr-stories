import { error, fail, redirect } from '@sveltejs/kit';
import { cellsFromForm, toCells } from '#lib/schema.ts';
import { store } from '#lib/server/store.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const stories = await store.list();
	const story = stories.find((s) => s.id === params.id);
	if (!story) error(404, `There is no ${params.id}`);
	return { values: toCells(story), stories };
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		// Unticking every user class sends nothing for that field, so start from "none".
		const cells = { user_classes: '', ...cellsFromForm(await request.formData()) };
		const result = await store.update(params.id, cells);
		if (result.status === 'missing') error(404, `There is no ${params.id}`);
		if (result.status === 'invalid') {
			return fail(400, { values: { ...cells, id: params.id }, errors: result.errors });
		}
		redirect(303, `/stories/${params.id}`);
	}
};
