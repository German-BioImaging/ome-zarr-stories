import { store } from '#lib/server/store.ts';
import { similarityMap } from '#lib/server/similarity.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const stories = await store.list();
	return { stories, ...similarityMap(stories) };
};
