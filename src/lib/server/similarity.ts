/**
 * A 2D map of the stories where similar ones sit close together.
 *
 * Text → TF-IDF vectors → cosine similarity → force layout: each story is pulled towards its few
 * most similar stories and pushed away from all the others. No model or network call, and the
 * result is deterministic, so the map looks the same every time for the same stories.
 */
import type { Story } from '../schema.ts';

// Words too common in these stories to say anything about what one is about.
const STOPWORDS = new Set(
	`a about all also an and any are as at be been but by can could do does e.g each etc for from
	has have how i if in into is it its may might more most no not of on one or other our same should
	so some such than that the their them then there these they this those to under use used using
	want was way we were what when where whether which while who will with without would you
	user users story data image images ome zarr ngff omezarr spec metadata store stored storing save`.split(/\s+/)
);

export function words(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/https?:\/\/\S+/g, ' ')
		.split(/[^a-z0-9]+/)
		.filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
		.map((w) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

type Vector = Map<string, number>;

/** TF-IDF vector per document, normalized to length 1. */
function vectors(docs: string[][]): Vector[] {
	const documentFrequency = new Map<string, number>();
	for (const doc of docs) for (const w of new Set(doc)) documentFrequency.set(w, (documentFrequency.get(w) ?? 0) + 1);
	return docs.map((doc) => {
		const v: Vector = new Map();
		for (const w of doc) v.set(w, (v.get(w) ?? 0) + 1);
		let norm = 0;
		for (const [w, tf] of v) {
			const weight = (1 + Math.log(tf)) * Math.log(docs.length / documentFrequency.get(w)!);
			v.set(w, weight);
			norm += weight * weight;
		}
		norm = Math.sqrt(norm) || 1;
		for (const [w, weight] of v) v.set(w, weight / norm);
		return v;
	});
}

const cosine = (a: Vector, b: Vector) => {
	let sum = 0;
	for (const [w, x] of a) sum += x * (b.get(w) ?? 0);
	return sum;
};

/** Deterministic pseudo-random numbers, so the layout doesn't change between page loads. */
function seeded(seed: number) {
	return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

export type MapPoint = { id: string; x: number; y: number };
export type MapLink = { source: string; target: string; similarity: number };

/** How many most-similar stories each story is linked to. */
const NEIGHBOURS = 3;

export function similarityMap(stories: Story[]): { points: MapPoint[]; links: MapLink[] } {
	const n = stories.length;
	if (n === 0) return { points: [], links: [] };

	// Title words count double: they are the most deliberate summary of a story.
	const docs = stories.map((s) => [...words(s.title), ...words(s.title), ...words(s.statement), ...words(s.workaround)]);
	const v = vectors(docs);
	const similarity = v.map((a) => v.map((b) => cosine(a, b)));

	// Each story's nearest neighbours; a link is kept once even when both ends chose it.
	const links = new Map<string, MapLink>();
	stories.forEach((story, i) => {
		const nearest = similarity[i]
			.map((sim, j) => ({ j, sim }))
			.filter(({ j, sim }) => j !== i && sim > 0.05)
			.sort((a, b) => b.sim - a.sim)
			.slice(0, NEIGHBOURS);
		for (const { j, sim } of nearest) {
			const [a, b] = i < j ? [i, j] : [j, i];
			links.set(`${a}-${b}`, { source: stories[a].id, target: stories[b].id, similarity: sim });
		}
	});
	const edges = [...links.values()].map((l) => ({
		a: stories.findIndex((s) => s.id === l.source),
		b: stories.findIndex((s) => s.id === l.target),
		sim: l.similarity
	}));

	// Force layout. ponytail: O(n²) per step, fine for hundreds of stories, not for tens of thousands.
	const random = seeded(42);
	const x = stories.map(() => random() - 0.5);
	const y = stories.map(() => random() - 0.5);
	const STEPS = 400;
	for (let step = 0; step < STEPS; step++) {
		const heat = 0.1 * (1 - step / STEPS) + 0.002;
		const dx = new Array(n).fill(0);
		const dy = new Array(n).fill(0);
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				const ex = x[i] - x[j];
				const ey = y[i] - y[j];
				const d2 = ex * ex + ey * ey + 1e-4;
				const push = 0.002 / d2; // everyone repels everyone
				dx[i] += ex * push; dy[i] += ey * push;
				dx[j] -= ex * push; dy[j] -= ey * push;
			}
		}
		for (const { a, b, sim } of edges) {
			const ex = x[b] - x[a];
			const ey = y[b] - y[a];
			const pull = 0.5 * (0.3 + sim); // more similar, stronger spring
			dx[a] += ex * pull; dy[a] += ey * pull;
			dx[b] -= ex * pull; dy[b] -= ey * pull;
		}
		for (let i = 0; i < n; i++) {
			// a weak pull to the centre keeps unlinked stories from drifting off
			dx[i] -= x[i] * 0.05; dy[i] -= y[i] * 0.05;
			const length = Math.hypot(dx[i], dy[i]);
			const scale = length > heat ? heat / length : 1;
			x[i] += dx[i] * scale;
			y[i] += dy[i] * scale;
		}
	}

	// Fit into 0…1 on both axes.
	const fit = (values: number[]) => {
		const min = Math.min(...values);
		const range = Math.max(...values) - min || 1;
		return values.map((value) => (value - min) / range);
	};
	const fx = fit(x);
	const fy = fit(y);
	return {
		points: stories.map((s, i) => ({ id: s.id, x: fx[i], y: fy[i] })),
		links: [...links.values()]
	};
}
