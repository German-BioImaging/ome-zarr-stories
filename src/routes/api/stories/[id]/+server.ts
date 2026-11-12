import { error, json } from '@sveltejs/kit';
import { COLUMNS, LABELS, type Cells } from '#lib/schema.ts';
import { store } from '#lib/server/store.ts';
import type { RequestHandler } from './$types';

/** Changes some fields of one story, e.g. `{ "moscow": "Must" }`. */
export const PATCH: RequestHandler = async ({ params, request }) => {
	const body: unknown = await request.json().catch(() => null);
	if (!body || typeof body !== 'object' || Array.isArray(body)) error(400, 'Expected a JSON object of fields to change');

	const changes: Cells = {};
	for (const [column, value] of Object.entries(body)) {
		if (column === 'id' || !COLUMNS.includes(column) || typeof value !== 'string') {
			error(400, `Cannot set "${column}"`);
		}
		changes[column] = value;
	}

	const result = await store.update(params.id, changes);
	if (result.status === 'missing') error(404, `${params.id} no longer exists`);
	if (result.status === 'invalid') {
		const [[column, message]] = Object.entries(result.errors);
		error(400, `${LABELS[column] ?? column}: ${message}`);
	}
	return json(result.story);
};
