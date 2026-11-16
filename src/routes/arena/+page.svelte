<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	const base = resolve('/').replace(/\/$/, '');
	import { SPEC_VERSIONS, STATUSES, statusColour } from '#lib/schema.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

</script>

<header class="top">
	<div>
		<h1>Story arena</h1>
		<p class="muted">Which user story do you prefer?</p>
	</div>
	<form class="filters">
		<label
			>Status
			<select name="status" value={data.status} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
				<option value="open">Not yet solved</option>
				<option value="">Any</option>
				{#each STATUSES as s (s)}<option value={s}>{s}</option>{/each}
			</select></label
		>
		<label
			>in
			<select name="v" value={data.version} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
				{#each SPEC_VERSIONS as v (v)}<option value={v}>{v}</option>{/each}
			</select></label
		>
	</form>
</header>

{#if data.pair.length}
	<div class="pair">
		{#each data.pair as story, i (story.id)}
			<form method="POST" use:enhance>
				<input type="hidden" name="winner" value={story.id} />
				<input type="hidden" name="loser" value={data.pair[1 - i].id} />
				<button class="card">
					<span class="meta">
						<span>{story.id}</span>
						<span class="status" style:--c={statusColour(story.status[data.version])}
							>{story.status[data.version]}</span
						>
					</span>
					<strong>{story.title}</strong>
					<span class="statement">
						{#each story.statement.split('\\n') as line, j (j)}<span>{line}</span>{/each}
					</span>
				</button>
			</form>
			{#if i === 0}<span class="vs" aria-hidden="true">or</span>{/if}
		{/each}
	</div>
	<p class="muted center">
		{data.total} comparisons so far · <a class="button" href="?{new URLSearchParams({ status: data.status, v: data.version })}">Skip</a>
	</p>
{:else}
	<p class="muted">Fewer than two stories match this filter.</p>
{/if}

<details>
	<summary>Ranking ({data.ranking.length} stories)</summary>
	<ol class="ranking">
		{#each data.ranking as r (r.id)}
			<li>
				<a href="{base}/stories/{r.id}">{r.id}</a>
				<span>{r.title}</span>
				<span class="muted num">{Math.round(r.elo)} · {r.games}</span>
			</li>
		{/each}
	</ol>
</details>

<style>
	.top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 1rem; }
	.top h1 { margin-bottom: 0.25rem; }
	.muted { color: var(--muted); }
	.center { text-align: center; }
	.filters { display: flex; gap: 0.5rem; align-items: center; }
	.filters label { display: flex; gap: 0.4rem; align-items: center; color: var(--muted); }
	.pair { display: grid; grid-template-columns: 1fr auto 1fr; gap: 1rem; align-items: stretch; margin: 1.5rem 0 0.5rem; }
	.vs { align-self: center; color: var(--muted); font-style: italic; }
	.card {
		display: flex; flex-direction: column; gap: 0.6rem; width: 100%; height: 100%;
		text-align: left; padding: 1.25rem; cursor: pointer; font: inherit; color: var(--text);
		background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
		transition: border-color 0.15s, transform 0.15s;
	}
	.card:hover, .card:focus-visible { border-color: var(--accent); transform: translateY(-2px); }
	.card strong { font-size: 1.1rem; }
	.meta { display: flex; justify-content: space-between; color: var(--muted); font-size: 0.85rem; }
	.status { color: var(--c); }
	.statement { display: flex; flex-direction: column; gap: 0.2rem; line-height: 1.45; }
	.ranking { padding-left: 2rem; }
	.ranking li { display: grid; grid-template-columns: 6rem 1fr auto; gap: 0.75rem; padding: 0.2rem 0; }
	.num { font-variant-numeric: tabular-nums; }
	@media (max-width: 640px) {
		.pair { grid-template-columns: 1fr; }
	}
</style>
