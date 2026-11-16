<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	const base = resolve('/').replace(/\/$/, '');
	import { SPEC_VERSIONS, STATUSES, statusColour } from '#lib/schema.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let forms: HTMLFormElement[] = $state([]);
	let skip: HTMLAnchorElement | undefined = $state();
	// Two steps so nothing is recorded by accident: ← / → (or a click on the card) only selects,
	// Enter or the card's "Choose" button records. Esc clears; ↓ or S skips.
	let selected = $state<number | null>(null);
	$effect(() => {
		data.pair; // a new pair clears the selection
		selected = null;
	});
	function key(e: KeyboardEvent) {
		if (e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement).closest('input, select, textarea, button, a')) return;
		const actions: Record<string, () => void> = {
			ArrowLeft: () => (selected = 0),
			ArrowRight: () => (selected = 1),
			Escape: () => (selected = null),
			Enter: () => selected !== null && forms[selected]?.requestSubmit(),
			ArrowDown: () => skip?.click(),
			s: () => skip?.click()
		};
		const action = actions[e.key];
		if (action) {
			e.preventDefault();
			action();
		}
	}
	const submit = (e: Event & { currentTarget: HTMLSelectElement }) => e.currentTarget.form?.requestSubmit();
</script>

<svelte:window onkeydown={key} />

<div class="toolbar">
	<h1>Story arena</h1>
	<form class="filters">
		<label
			>Status
			<select name="status" value={data.status} onchange={submit}>
				<option value="open">Not yet solved</option>
				<option value="">Any</option>
				{#each STATUSES as s (s)}<option value={s}>{s}</option>{/each}
			</select></label
		>
		<label
			>in
			<select name="v" value={data.version} onchange={submit}>
				{#each SPEC_VERSIONS as v (v)}<option value={v}>{v}</option>{/each}
			</select></label
		>
	</form>
</div>

<section class="arena">
	<h2 class="question">Which user story do you prefer?</h2>

	{#if data.pair.length}
		<div class="pair">
			{#each data.pair as story, i (story.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<div class="card" class:selected={selected === i} onclick={() => (selected = i)}>
					<span class="meta">
						<a href="{base}/stories/{story.id}" target="_blank" rel="noopener">{story.id} ↗</a>
						<span class="status"
							><i style:background={statusColour(story.status[data.version])}></i>{story.status[data.version]}</span
						>
					</span>
					<strong>{story.title}</strong>
					<span class="statement">
						{#each story.statement.split('\\n') as line, j (j)}<span>{line}</span>{/each}
					</span>
					<form method="POST" use:enhance bind:this={forms[i]} class="choose">
						<input type="hidden" name="winner" value={story.id} />
						<input type="hidden" name="loser" value={data.pair[1 - i].id} />
						<button class="button" class:primary={selected === i}>Choose this story</button>
						<span class="muted"
							>{#if selected === i}<kbd>Enter</kbd> to confirm{:else}or <kbd>{i === 0 ? '←' : '→'}</kbd>, then <kbd
									>Enter</kbd
								>{/if}</span
						>
					</form>
				</div>
			{/each}
		</div>
		<div class="footer">
			<a class="button" bind:this={skip} href="?{new URLSearchParams({ status: data.status, v: data.version })}">Skip <kbd>↓</kbd></a>
			<span class="muted">{data.total} comparisons so far · keys: <kbd>←</kbd>/<kbd>→</kbd> select, <kbd>Enter</kbd> confirm, <kbd>Esc</kbd> clear, <kbd>↓</kbd> or <kbd>S</kbd> skip</span>
		</div>
	{:else}
		<p class="muted">Fewer than two stories match this filter.</p>
	{/if}
</section>

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
	.toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; }
	.toolbar h1 { margin: 0; font-size: 1.25rem; }
	.filters { display: flex; gap: 0.5rem; }
	.filters label { display: flex; gap: 0.4rem; align-items: center; color: var(--muted); font-size: 0.9rem; }
	.muted { color: var(--muted); }

	.arena { max-width: 60rem; margin: 2.5rem auto 2rem; }
	.question { text-align: center; font-size: 1.6rem; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 1.75rem; }
	.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
	.card {
		display: flex; flex-direction: column; gap: 0.75rem; height: 100%;
		padding: 1.5rem; color: var(--text); cursor: default;
		background: var(--surface); border: 1px solid var(--line); border-radius: 8px;
		transition: border-color 0.15s, box-shadow 0.15s;
	}
	.card.selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
	.choose { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-top: auto; padding-top: 0.75rem; border-top: 1px solid var(--line); font-size: 0.8rem; }
	.card strong { font-size: 1.1rem; line-height: 1.35; }
	.meta { display: flex; justify-content: space-between; color: var(--muted); font-size: 0.8rem; }
	.status { display: inline-flex; align-items: center; gap: 0.4rem; }
	.status i { width: 0.5rem; height: 0.5rem; border-radius: 50%; }
	.statement { display: flex; flex-direction: column; gap: 0.15rem; line-height: 1.5; color: var(--muted); }
	kbd { display: inline-block; min-width: 1.4em; padding: 0 0.3em; border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 4px; font: inherit; font-size: 0.8rem; text-align: center; background: var(--bg); color: var(--text); }
	.footer { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; margin-top: 1.5rem; font-size: 0.85rem; }

	.ranking { padding-left: 2rem; }
	.ranking li { display: grid; grid-template-columns: 6rem 1fr auto; gap: 0.75rem; padding: 0.2rem 0; }
	.num { font-variant-numeric: tabular-nums; }
	@media (max-width: 640px) {
		.pair { grid-template-columns: 1fr; }
		.question { font-size: 1.3rem; }
	}
</style>
