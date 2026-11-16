import { error, redirect } from '@sveltejs/kit';
import { store } from '#lib/server/store.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const stories = await store.list();
	const story = stories.find((s) => s.id === params.id);
	if (!story) error(404, `There is no ${params.id}`);
	return { story, stories };
};

// No actions in the static build: pages with actions cannot be prerendered.
export const actions: Actions | undefined = __STATIC__
	? undefined
	: {
			delete: async ({ params }) => {
				const result = await store.remove(params.id);
				if (result.status === 'missing') error(404, `There is no ${params.id}`);
				redirect(303, '/');
			}
		};
