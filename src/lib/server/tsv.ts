/** Reading and writing the stories file. Pure functions: no disk access here. */
import { COLUMNS, linkErrors, parseCells, toCells, type Story } from '../schema.ts';

/** The file on disk breaks the rules; `issues` says where. */
export class DataError extends Error {
	issues: string[];
	constructor(issues: string[]) {
		super('user-stories.tsv is not valid');
		this.issues = issues;
	}
}

// One story per line: tabs, line breaks and backslashes inside a cell are stored escaped.
export const escape = (text: string) =>
	text.replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\r\n?|\n/g, '\\n');
export const unescape = (cell: string) =>
	cell.replace(/\\([\\tn])/g, (_, c: string) => (c === 't' ? '\t' : c === 'n' ? '\n' : '\\'));

export const HEADER = COLUMNS.join('\t');

export function serializeRow(story: Story): string {
	const cells = toCells(story);
	return COLUMNS.map((column) => escape(cells[column])).join('\t');
}

export const serialize = (lines: readonly string[]) => [HEADER, ...lines].join('\n') + '\n';

/** `lines[i]` is the raw text of `stories[i]`, kept so a write only touches the rows it changes. */
export type Document = { stories: Story[]; lines: string[] };

/** Parses and validates the whole file. Throws `DataError` listing every problem found. */
export function parse(text: string): Document {
	const [header, ...lines] = text
		.replace(/\n+$/, '')
		.split('\n')
		.map((line) => line.replace(/\r$/, ''));
	if (header !== HEADER) {
		throw new DataError([`Line 1: the header must be exactly these tab-separated columns: ${COLUMNS.join(', ')}`]);
	}

	const issues: string[] = [];
	const stories: Story[] = [];
	lines.forEach((line, index) => {
		const where = `Line ${index + 2}`;
		const cells = line.split('\t');
		if (cells.length !== COLUMNS.length) {
			issues.push(`${where}: expected ${COLUMNS.length} columns, found ${cells.length}`);
			return;
		}
		const result = parseCells(
			Object.fromEntries(COLUMNS.map((column, i) => [column, unescape(cells[i])]))
		);
		if ('errors' in result) {
			for (const [column, message] of Object.entries(result.errors)) {
				issues.push(`${where} (${cells[0]}), ${column}: ${message}`);
			}
		} else {
			stories.push(result.story);
		}
	});
	if (issues.length) throw new DataError(issues);

	const ids = new Set<string>();
	for (const story of stories) {
		if (ids.has(story.id)) issues.push(`${story.id} appears more than once`);
		ids.add(story.id);
	}
	for (const story of stories) {
		const { related } = linkErrors(story, ids);
		if (related) issues.push(`${story.id}, related: ${related}`);
	}
	if (issues.length) throw new DataError(issues);

	return { stories, lines };
}
