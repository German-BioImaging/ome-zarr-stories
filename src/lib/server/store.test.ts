import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import { COLUMNS, SPEC_VERSIONS, STATUSES, blankCells, statusColumn, toCells, type Cells } from '../schema.ts';
import { createStore } from './store.ts';
import { DataError, HEADER, escape, parse, serialize, unescape } from './tsv.ts';

const REAL_FILE = 'user-stories.tsv';

const row = (id: string, changes: Record<string, string> = {}) => {
	const cells: Cells = { ...blankCells('2026-11-12'), id, title: `Title ${id}`, statement: 'As a…', ...changes };
	return COLUMNS.map((column) => escape(cells[column])).join('\t');
};
const file = (...rows: string[]) => serialize(rows);
const issues = (text: string) => {
	try {
		parse(text);
	} catch (e) {
		if (e instanceof DataError) return e.issues.join('\n');
		throw e;
	}
	return '';
};

describe('the real user-stories.tsv', () => {
	test('is valid and serializes back byte for byte', async () => {
		const text = await readFile(REAL_FILE, 'utf-8');
		const doc = parse(text);
		expect(doc.stories.length).toBeGreaterThan(0);
		expect(serialize(doc.lines)).toBe(text);
		// re-serializing from the parsed stories gives the same bytes: the file is in normal form
		expect(serialize(doc.stories.map((s) => COLUMNS.map((c) => escape(toCells(s)[c])).join('\t')))).toBe(text);
	});
});

describe('escaping', () => {
	test('round-trips line breaks, tabs and backslashes on one line', () => {
		const text = 'a\tb\nc\\n \\ d\r\ne';
		expect(escape(text)).not.toMatch(/[\t\n\r]/);
		expect(unescape(escape(text))).toBe('a\tb\nc\\n \\ d\ne');
	});
});

describe('validation rejects', () => {
	test.each([
		['a changed header', HEADER.replace('title', 'Title') + '\n' + row('STORY-001'), 'header'],
		['a wrong column count', file(row('STORY-001') + '\textra'), 'expected 17 columns, found 18'],
		['a bad ID', file(row('US-1')), 'STORY-001'],
		['a missing title', file(row('STORY-001', { title: ' ' })), 'Title is required'],
		['an unknown priority', file(row('STORY-001', { moscow: 'Maybe' })), 'moscow'],
		['a score out of range', file(row('STORY-001', { value: '6' })), 'value: Must be 1 to 5'],
		['an unknown status', file(row('STORY-001', { [statusColumn(SPEC_VERSIONS[0])]: 'Done' })), 'Must be one of'],
		['an unknown user class', file(row('STORY-001', { user_classes: 'Wizard' })), 'user_classes'],
		['a malformed RFC', file(row('STORY-001', { rfcs: 'rfc5' })), 'RFC-5'],
		['an impossible date', file(row('STORY-001', { reviewed: '2026-02-30' })), 'reviewed'],
		['a non-http origin', file(row('STORY-001', { origin: 'javascript:alert(1)' })), 'origin'],
		['a duplicate ID', file(row('STORY-001'), row('STORY-001')), 'more than once'],
		['a link to a missing story', file(row('STORY-001', { related: 'STORY-009' })), 'STORY-009'],
		['a link to itself', file(row('STORY-001', { related: 'STORY-001' })), 'related']
	])('%s', (_, text, expected) => {
		expect(issues(text)).toContain(expected);
	});

	test('nothing in a valid file', () => {
		expect(issues(file(row('STORY-001'), row('STORY-002', { related: 'STORY-001', value: '5' })))).toBe('');
	});
});

describe('store', () => {
	let path: string;
	let store: ReturnType<typeof createStore>;
	const lines = async () => (await readFile(path, 'utf-8')).split('\n');

	beforeEach(async () => {
		path = join(await mkdtemp(join(tmpdir(), 'stories-')), 'stories.tsv');
		// STORY-001 is deliberately not in normal form (" ;" separator) to prove untouched rows are left alone
		await writeFile(
			path,
			file(row('STORY-001', { rfcs: 'RFC-5 ;RFC-7' }), row('STORY-002', { related: 'STORY-001; STORY-003' }), row('STORY-003'))
		);
		store = createStore(path);
	});

	test('update changes only that story’s line', async () => {
		const before = await lines();
		const result = await store.update('STORY-003', { moscow: 'Must', value: '5', effort: '2' });
		expect(result).toMatchObject({ status: 'ok', story: { moscow: 'Must', value: 5, effort: 2 } });
		const after = await lines();
		expect(after.filter((line, i) => line !== before[i])).toEqual([after[3]]);
		expect(after[3]).toContain('\tMust\t5\t2\t');
	});

	test('update keeps line breaks in the statement on one line', async () => {
		await store.update('STORY-003', { statement: '1. first\n2. second' });
		expect((await lines())[3]).toContain('1. first\\n2. second');
		expect((await store.list())[2].statement).toBe('1. first\n2. second');
	});

	test('an invalid update is refused and the file is untouched', async () => {
		const before = await readFile(path, 'utf-8');
		expect(await store.update('STORY-003', { value: '9' })).toMatchObject({ status: 'invalid', errors: { value: expect.any(String) } });
		expect(await store.update('STORY-003', { related: 'STORY-099' })).toMatchObject({ status: 'invalid', errors: { related: expect.any(String) } });
		expect(await store.update('STORY-099', { value: '1' })).toEqual({ status: 'missing' });
		expect(await readFile(path, 'utf-8')).toBe(before);
	});

	test('create appends a line with the next free ID', async () => {
		const before = await lines();
		const result = await store.create({ ...blankCells('2026-11-12'), title: 'New', statement: 'As a…', id: 'STORY-001' });
		expect(result).toMatchObject({ status: 'ok', story: { id: 'STORY-004', status: { [SPEC_VERSIONS[0]]: STATUSES[0] } } });
		const after = await lines();
		expect(after.slice(0, 4)).toEqual(before.slice(0, 4));
		expect(after[4]).toMatch(/^STORY-004\tNew\t/);
	});

	test('remove deletes the line and the links that pointed to it', async () => {
		const before = await lines();
		expect(await store.remove('STORY-003')).toMatchObject({ status: 'ok' });
		const after = await lines();
		expect(after[1]).toBe(before[1]);
		expect(after.length).toBe(before.length - 1);
		expect((await store.list())[1].related).toEqual(['STORY-001']);
	});

	test('a change made outside the app survives a later update', async () => {
		await store.list(); // the app has "seen" the old file
		const outside = (await readFile(path, 'utf-8')).replace('Title STORY-001', 'Edited by hand');
		await writeFile(path, outside);
		await store.update('STORY-003', { moscow: 'Could' });
		const stories = await store.list();
		expect(stories[0].title).toBe('Edited by hand');
		expect(stories[2].moscow).toBe('Could');
	});

	test('simultaneous updates are all applied', async () => {
		await Promise.all([
			store.update('STORY-001', { value: '1' }),
			store.update('STORY-002', { value: '2' }),
			store.update('STORY-003', { value: '3' })
		]);
		expect((await store.list()).map((s) => s.value)).toEqual([1, 2, 3]);
	});

	test('a broken file is reported, not half-loaded', async () => {
		await writeFile(path, file(row('STORY-001'), 'garbage'));
		await expect(store.list()).rejects.toBeInstanceOf(DataError);
		await expect(store.update('STORY-001', { value: '1' })).rejects.toBeInstanceOf(DataError);
	});
});
