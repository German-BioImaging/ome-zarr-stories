import { refreshAll } from '$app/navigation';
import { notify } from './notice.svelte.ts';
import type { Cells } from './schema.ts';

/** Saves a change to one story from the browser. Resolves to whether it was saved. */
export async function patchStory(id: string, changes: Cells): Promise<boolean> {
	let saved = false;
	try {
		const response = await fetch(`/api/stories/${id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(changes)
		});
		if (!response.ok) throw new Error((await response.json()).message);
		saved = true;
		notify('Saved');
	} catch (e) {
		notify(`Not saved: ${e instanceof Error ? e.message : e}`, true);
	}
	await refreshAll();
	return saved;
}
