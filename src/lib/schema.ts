/** The one definition of a story: columns, labels, allowed values and validation. */
import * as z from 'zod';
import { config } from './config.ts';

export const SPEC_VERSIONS: readonly string[] = config.spec_versions;
export const LATEST_VERSION = SPEC_VERSIONS[SPEC_VERSIONS.length - 1];
export const STATUSES: readonly string[] = config.statuses.map((s) => s.name);
const STATUS_INFO = new Map(config.statuses.map((s) => [s.name, s]));
/** CSS colour of a status, the same everywhere it is shown. */
export const statusColour = (status: string) => `var(--${STATUS_INFO.get(status)?.colour ?? 'grey'})`;
export const statusDescription = (status: string) => STATUS_INFO.get(status)?.description ?? '';
/** Whether the spec already covers a story with this status well enough to set it aside. */
export const isSolved = (status: string) => STATUS_INFO.get(status)?.solved ?? false;
export const USER_CLASSES = config.user_classes;
export const MOSCOW: readonly string[] = ['Must', 'Should', 'Could', "Won't"];
export const SCORES: readonly number[] = [1, 2, 3, 4, 5];

export const statusColumn = (version: string) => `status_${version}`;

/** Column order of the TSV. */
export const COLUMNS: readonly string[] = [
	'id',
	'title',
	'statement',
	'user_classes',
	'requested_by',
	'moscow',
	'value',
	'effort',
	...SPEC_VERSIONS.map(statusColumn),
	'workaround',
	'rfcs',
	'related',
	'origin',
	'sources',
	'examples',
	'reviewed'
];

export const LABELS: Record<string, string> = {
	id: 'ID',
	title: 'Title',
	statement: 'Statement',
	user_classes: 'User classes',
	requested_by: 'Requested by',
	moscow: 'Priority',
	value: 'Value',
	effort: 'Effort',
	...Object.fromEntries(SPEC_VERSIONS.map((v) => [statusColumn(v), `Status (${v})`])),
	workaround: 'Workaround / how',
	rfcs: 'RFCs',
	related: 'Related stories',
	origin: 'Origin',
	sources: 'Sources',
	examples: 'Example data',
	reviewed: 'Last reviewed'
};

/** A row as plain text, keyed by column: what the TSV and HTML forms hold. */
export type Cells = Record<string, string>;
export type FieldErrors = Record<string, string>;

const ID_PATTERN = /^STORY-\d{3,}$/;
const text = z.string().trim();
const oneOf = (allowed: readonly string[]) =>
	z.string().refine((v) => allowed.includes(v), `Must be one of: ${allowed.join(', ')}`);

/** List cells hold items separated by `; ` (forms may also send one item per line). */
const splitItems = (cell: string) =>
	cell
		.split(/[;\n]/)
		.map((item) => item.trim())
		.filter(Boolean);
const list = (item: z.ZodType<string, string> = z.string()) =>
	z.string().transform(splitItems).pipe(z.array(item));

const scoreCell = text
	.refine((v) => v === '' || /^[1-5]$/.test(v), 'Must be 1 to 5, or blank')
	.transform((v) => (v === '' ? null : Number(v)));

const isHttpUrl = (v: string) => /^https?:\/\/\S+$/.test(v) && URL.canParse(v);
const isIsoDate = (v: string) =>
	/^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v).toISOString().startsWith(v);

const fields = z.object({
	id: z.string().regex(ID_PATTERN, 'Must look like STORY-001'),
	title: text.min(1, 'Title is required'),
	statement: text.min(1, 'Statement is required'),
	user_classes: list(oneOf(USER_CLASSES.map((c) => c.name))),
	requested_by: list(),
	moscow: text.refine((v) => v === '' || MOSCOW.includes(v), `Must be ${MOSCOW.join(', ')}, or blank`),
	value: scoreCell,
	effort: scoreCell,
	workaround: text,
	rfcs: list(z.string().regex(/^RFC-\d+$/, 'Each RFC must look like RFC-5')),
	related: list(z.string().regex(ID_PATTERN, 'Each related story must look like STORY-001')),
	origin: text.refine((v) => v === '' || isHttpUrl(v), 'Must be a full http(s) link, or blank'),
	sources: list(),
	examples: list(),
	reviewed: text.refine((v) => v === '' || isIsoDate(v), 'Must be a date like 2026-11-12, or blank')
});

export type Story = z.output<typeof fields> & {
	/** Status per spec version, e.g. `{ '0.6': 'Core' }`. */
	status: Record<string, string>;
};

/** Validates one row. Cross-row rules (unique IDs, related stories exist) are in `linkErrors`. */
export function parseCells(cells: Cells): { story: Story } | { errors: FieldErrors } {
	const errors: FieldErrors = {};
	const parsed = fields.safeParse(cells);
	if (!parsed.success) {
		for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
	}
	const status: Story['status'] = {};
	for (const version of SPEC_VERSIONS) {
		const column = statusColumn(version);
		status[version] = (cells[column] ?? '').trim();
		if (!STATUSES.includes(status[version])) {
			errors[column] = `Must be one of: ${STATUSES.join(', ')}`;
		}
	}
	if (!parsed.success || Object.keys(errors).length) return { errors };
	return { story: { ...parsed.data, status } };
}

/** A story may only link to other stories that exist. */
export function linkErrors(story: Story, ids: ReadonlySet<string>): FieldErrors {
	const bad = story.related.filter((id) => id === story.id || !ids.has(id));
	return bad.length ? { related: `Not an existing other story: ${bad.join(', ')}` } : {};
}

const toCell = (value: unknown) =>
	Array.isArray(value) ? value.join('; ') : value == null ? '' : String(value);

export function toCells(story: Story): Cells {
	const { status, ...rest } = story;
	return {
		...Object.fromEntries(Object.entries(rest).map(([column, value]) => [column, toCell(value)])),
		...Object.fromEntries(SPEC_VERSIONS.map((v) => [statusColumn(v), status[v]]))
	};
}

/** Starting values for a new story. */
export function blankCells(today: string): Cells {
	return {
		...Object.fromEntries(COLUMNS.map((column) => [column, ''])),
		...Object.fromEntries(SPEC_VERSIONS.map((v) => [statusColumn(v), STATUSES[0]])),
		reviewed: today
	};
}

/** Reads the story columns out of a submitted form; repeated fields (checkboxes) become a list. */
export function cellsFromForm(form: FormData): Cells {
	const cells: Cells = {};
	for (const column of COLUMNS) {
		if (column === 'id' || !form.has(column)) continue;
		cells[column] = form
			.getAll(column)
			.filter((value) => typeof value === 'string')
			.join('; ');
	}
	return cells;
}

export function nextId(stories: readonly Story[]): string {
	const max = Math.max(0, ...stories.map((s) => Number(s.id.slice('STORY-'.length))));
	return `STORY-${String(max + 1).padStart(3, '0')}`;
}

/** Value for effort: higher means more worth doing first. */
export function score(story: Story): number | null {
	return story.value && story.effort ? Math.round((story.value / story.effort) * 100) / 100 : null;
}

/** Stories linked to this one, in either direction. */
export function relatedTo(story: Story, stories: readonly Story[]): Story[] {
	return stories.filter(
		(other) =>
			other.id !== story.id && (story.related.includes(other.id) || other.related.includes(story.id))
	);
}

/** Local calendar date as YYYY-MM-DD. */
export const today = () => new Date().toLocaleDateString('sv');
