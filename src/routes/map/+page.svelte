<script lang="ts">
	import { resolve } from '$app/paths';
	const base = resolve('/').replace(/\/$/, ''); // '' locally, '/ngff-stories' on GitHub Pages
	import { building } from '$app/env';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { LATEST_VERSION, SPEC_VERSIONS, STATUSES, statusColour as colour, statusDescription, type Story } from '#lib/schema.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Which version's assessment colours the dots; kept in the address bar like the table filters.
	const version = $derived(
		!building && SPEC_VERSIONS.includes(page.url.searchParams.get('version') ?? '')
			? page.url.searchParams.get('version')!
			: LATEST_VERSION
	);
	const setVersion = (v: string) => goto(`?version=${encodeURIComponent(v)}`, { replace: true, reset: false });


	const W = 1000;
	const H = 640;
	const PAD = 40;
	const byId = $derived(new Map(data.stories.map((s) => [s.id, s])));
	const at = $derived(
		new Map(data.points.map((p) => [p.id, { x: PAD + p.x * (W - 2 * PAD), y: PAD + p.y * (H - 2 * PAD) }]))
	);

	let hovered = $state<Story | null>(null);
	const neighbours = $derived(
		hovered
			? new Set(
					data.links
						.filter((l) => l.source === hovered!.id || l.target === hovered!.id)
						.flatMap((l) => [l.source, l.target])
				)
			: null
	);
	const counts = $derived(
		STATUSES.map((status) => ({ status, n: data.stories.filter((s) => s.status[version] === status).length }))
	);
</script>

<svelte:head><title>Map · OME-Zarr user stories</title></svelte:head>

<div class="bar">
	<p class="muted">
		Stories with similar wording sit close together; lines join each story to its most similar
		ones. Hover to see a story, click to open it.
	</p>
	<label>
		Colour by status in
		<select value={version} onchange={(e) => setVersion(e.currentTarget.value)}>
			{#each SPEC_VERSIONS as v (v)}<option>{v}</option>{/each}
		</select>
	</label>
</div>

<ul class="legend" aria-label="Legend">
	{#each counts as { status, n } (status)}
		<li title={statusDescription(status)}><span class="dot" style:background={colour(status)}></span>{status} <b>{n}</b></li>
	{/each}
</ul>

<div class="card frame">
	<svg viewBox="0 0 {W} {H}" role="img" aria-label="Map of stories by similarity">
		<g class="links">
			{#each data.links as link (link.source + link.target)}
				{@const a = at.get(link.source)!}
				{@const b = at.get(link.target)!}
				<line
					x1={a.x}
					y1={a.y}
					x2={b.x}
					y2={b.y}
					stroke-width={0.5 + link.similarity * 3}
					class:lit={hovered && (link.source === hovered.id || link.target === hovered.id)}
				/>
			{/each}
		</g>
		{#each data.points as point (point.id)}
			{@const story = byId.get(point.id)!}
			{@const p = at.get(point.id)!}
			<a
				href="{base}/stories/{story.id}"
				aria-label="{story.id} {story.title}, {story.status[version]}"
				class:faded={neighbours && !neighbours.has(story.id)}
				onmouseenter={() => (hovered = story)}
				onmouseleave={() => (hovered = null)}
				onfocus={() => (hovered = story)}
				onblur={() => (hovered = null)}
			>
				<circle cx={p.x} cy={p.y} r="9" fill={colour(story.status[version])}
					class:hollow={colour(story.status[version]) === 'var(--hollow)'} />
				<text x={p.x} y={p.y + 22}>{story.id.replace('STORY-', '')}</text>
			</a>
		{/each}
	</svg>

	{#if hovered}
		{@const p = at.get(hovered.id)!}
		<div
			class="tip card"
			style:left="{(p.x / W) * 100}%"
			style:top="{(p.y / H) * 100}%"
			class:left={p.x > W * 0.65}
		>
			<p class="muted">{hovered.id} · {hovered.status[version]}</p>
			<strong>{hovered.title}</strong>
			<p class="statement">{hovered.statement}</p>
		</div>
	{/if}
</div>

<style>
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}
	.bar p {
		margin: 0;
		max-width: 720px;
	}
	label {
		display: flex;
		align-items: center;
		gap: 8px;
		white-space: nowrap;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		list-style: none;
		padding: 0;
		margin: 12px 0;
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.legend b {
		color: var(--muted);
		font-weight: 600;
	}
	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1px solid color-mix(in srgb, var(--muted) 60%, transparent); /* keeps hollow visible */
	}
	.frame {
		position: relative;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
	}
	line {
		stroke: var(--line);
	}
	line.lit {
		stroke: var(--accent);
	}
	a circle {
		stroke: var(--surface);
		stroke-width: 2;
		transition: r 0.1s;
	}
	circle.hollow {
		stroke: var(--muted);
		stroke-width: 1.5;
	}
	a:hover circle,
	a:focus circle {
		r: 13;
	}
	a:focus {
		outline: none;
	}
	a:focus circle {
		stroke: var(--accent);
	}
	a.faded {
		opacity: 0.25;
	}
	text {
		font-size: 11px;
		fill: var(--muted);
		text-anchor: middle;
		pointer-events: none;
	}
	.tip {
		position: absolute;
		transform: translate(16px, -50%);
		width: 320px;
		padding: 10px 12px;
		pointer-events: none;
		box-shadow: 0 4px 16px rgb(0 0 0 / 0.12);
	}
	.tip.left {
		transform: translate(calc(-100% - 16px), -50%);
	}
	.tip p {
		margin: 0;
		font-size: 12px;
	}
	.tip .statement {
		margin-top: 4px;
		color: var(--muted);
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 5;
		line-clamp: 5;
		overflow: hidden;
	}
</style>
