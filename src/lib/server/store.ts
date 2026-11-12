/** The stories on disk. Every change re-reads the file, edits one story and writes it back. */
import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
	linkErrors,
	nextId,
	parseCells,
	toCells,
	type Cells,
	type FieldErrors,
	type Story
} from '../schema.ts';
import { parse, serialize, serializeRow, type Document } from './tsv.ts';

export type Result =
	| { status: 'ok'; story: Story }
	| { status: 'invalid'; errors: FieldErrors }
	| { status: 'missing' };

export function createStore(path: string) {
	const read = async () => parse(await readFile(path, 'utf-8'));

	// Changes run one at a time, each on a fresh read, so nothing is ever written from a stale copy
	// and edits made outside the app (an editor, git pull) are kept.
	let queue: Promise<unknown> = Promise.resolve();
	function change(edit: (doc: Document) => Result): Promise<Result> {
		const run = async () => {
			const doc = await read();
			const result = edit(doc);
			if (result.status === 'ok') {
				// Write beside the file, then swap: a crash can't leave a half-written file.
				const temp = `${path}.tmp`;
				await writeFile(temp, serialize(doc.lines), 'utf-8');
				await rename(temp, path);
			}
			return result;
		};
		const next = queue.then(run, run);
		queue = next;
		return next;
	}

	function validated(cells: Cells, doc: Document): Result {
		const parsed = parseCells(cells);
		if ('errors' in parsed) return { status: 'invalid', errors: parsed.errors };
		const ids = new Set(doc.stories.map((s) => s.id));
		const errors = linkErrors(parsed.story, ids);
		if (Object.keys(errors).length) return { status: 'invalid', errors };
		return { status: 'ok', story: parsed.story };
	}

	return {
		list: async (): Promise<Story[]> => (await read()).stories,

		/** Adds a story; the ID is assigned here so two additions can't collide. */
		create: (cells: Cells) =>
			change((doc) => {
				const result = validated({ ...cells, id: nextId(doc.stories) }, doc);
				if (result.status === 'ok') doc.lines.push(serializeRow(result.story));
				return result;
			}),

		/** Changes the given fields of one story; the others keep their value. */
		update: (id: string, changes: Cells) =>
			change((doc) => {
				const index = doc.stories.findIndex((s) => s.id === id);
				if (index < 0) return { status: 'missing' };
				const result = validated({ ...toCells(doc.stories[index]), ...changes, id }, doc);
				if (result.status === 'ok') doc.lines[index] = serializeRow(result.story);
				return result;
			}),

		/** Deletes a story and removes links to it from the stories that referenced it. */
		remove: (id: string) =>
			change((doc) => {
				const index = doc.stories.findIndex((s) => s.id === id);
				if (index < 0) return { status: 'missing' };
				const [story] = doc.stories.splice(index, 1);
				doc.lines.splice(index, 1);
				doc.stories.forEach((other, i) => {
					if (!other.related.includes(id)) return;
					other.related = other.related.filter((r) => r !== id);
					doc.lines[i] = serializeRow(other);
				});
				return { status: 'ok', story };
			})
	};
}

export const store = createStore(resolve(process.env.STORIES_FILE ?? 'user-stories.tsv'));
