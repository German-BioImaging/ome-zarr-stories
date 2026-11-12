import { describe, expect, test } from 'vitest';
import { blankCells, parseCells, type Story } from '../schema.ts';
import { similarityMap, words } from './similarity.ts';

const story = (id: string, title: string, statement: string): Story => {
	const result = parseCells({ ...blankCells('2026-11-12'), id, title, statement });
	if ('errors' in result) throw new Error(JSON.stringify(result.errors));
	return result.story;
};

const distance = (map: ReturnType<typeof similarityMap>, a: string, b: string) => {
	const p = map.points.find((pt) => pt.id === a)!;
	const q = map.points.find((pt) => pt.id === b)!;
	return Math.hypot(p.x - q.x, p.y - q.y);
};

describe('similarity map', () => {
	const stories = [
		story('STORY-001', 'Drift correction per timepoint', 'One affine transform per timepoint for drift correction of a timelapse.'),
		story('STORY-002', 'Timelapse drift registration', 'Registration of a drifting timelapse with a transform per timepoint.'),
		story('STORY-003', 'Channel colour lookup tables', 'Display colour and contrast lookup table per channel in the viewer.'),
		story('STORY-004', 'Default channel contrast', 'Viewer opens each channel with the saved colour and contrast.'),
		story('STORY-005', 'FRAP bleaching pulse', 'Record when and where a photobleaching pulse happened.')
	];

	test('puts similar stories closer than dissimilar ones', () => {
		const map = similarityMap(stories);
		expect(distance(map, 'STORY-001', 'STORY-002')).toBeLessThan(distance(map, 'STORY-001', 'STORY-003'));
		expect(distance(map, 'STORY-003', 'STORY-004')).toBeLessThan(distance(map, 'STORY-004', 'STORY-002'));
		expect(map.links).toContainEqual(expect.objectContaining({ source: 'STORY-001', target: 'STORY-002' }));
	});

	test('is deterministic and fits in the unit square', () => {
		const a = similarityMap(stories);
		expect(similarityMap(stories)).toEqual(a);
		for (const p of a.points) {
			expect(p.x).toBeGreaterThanOrEqual(0);
			expect(p.x).toBeLessThanOrEqual(1);
		}
	});

	test('handles no stories and ignores links, numbers and stopwords', () => {
		expect(similarityMap([])).toEqual({ points: [], links: [] });
		expect(words('As a user I want 3 timepoints, see https://x.org/drift')).toEqual(['timepoint', 'see']);
	});
});
