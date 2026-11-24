<script lang="ts">
	import { enhance } from '$app/forms';
	import { building } from '$app/env';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { pair, ratings, type Match } from '#lib/arena.ts';
	import { LATEST_VERSION, SPEC_VERSIONS, STATUSES, isSolved, statusColour } from '#lib/schema.ts';
	import type { PageProps } from './$types';

	const base = resolve('/').replace(/\/$/, '');
	const GUIDE = 'https://github.com/German-BioImaging/ome-zarr-stories#voting-in-the-arena';
	// Lead words of "As a…, I want…, so that…" lines, shown in bold (as on the story page).
	const lead = /^(As an?|I want|I need|I would like|so that|so)\b/i;

	let { data }: PageProps = $props();

	// Filters live in the address bar. Default status: not yet solved in the chosen version.
	const param = (k: string) => (building ? null : page.url.searchParams.get(k));
	const version = $derived(SPEC_VERSIONS.includes(param('v') ?? '') ? param('v')! : LATEST_VERSION);
	const status = $derived.by(() => {
		const s = param('status') ?? 'open';
		return s === '' || s === 'open' || STATUSES.includes(s) ? s : 'open';
	});
	const cls = $derived(param('class') ?? '');
	const classes = $derived([...new Set(data.stories.flatMap((x) => x.user_classes))].sort());
	// ponytail: an RFC ranking reuses the "class" slot (RFC-n never clashes with a user class name).
	const rfcs = $derived([...new Set(data.stories.flatMap((x) => x.rfcs))].sort((a, b) => +a.slice(4) - +b.slice(4)));
	const isRfc = $derived(/^RFC-\d+$/.test(cls));

	// Static site: votes stay in this browser (localStorage) until sent in by hand, see GUIDE.
	const KEY = 'arena-votes';
	let mine = $state<Match[]>([]);
	$effect(() => {
		if (!__STATIC__) return;
		try {
			mine = JSON.parse(localStorage.getItem(KEY) ?? '[]');
		} catch {
			mine = [];
		}
	});
	function keep(votes: Match[]) {
		mine = votes;
		try {
			localStorage.setItem(KEY, JSON.stringify(votes));
		} catch {
			/* private window: votes last for this visit only */
		}
	}
	function download() {
		const tsv = mine.map((m) => [m.winner, m.loser, m.at, m.cls ?? ''].join('\t')).join('\n') + '\n';
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([tsv], { type: 'text/tab-separated-values' }));
		a.download = 'my-arena-votes.tsv';
		a.click();
	}

	// Each user class has its own ranking; votes without a class form the overall one.
	const matches = $derived([...data.matches, ...mine].filter((m) => (m.cls ?? '') === cls));
	const stories = $derived(
		data.stories.filter(
			(x) =>
				(status === 'open' ? !isSolved(x.status[version]) : !status || x.status[version] === status) &&
				(!cls || (isRfc ? x.rfcs : x.user_classes).includes(cls))
		)
	);
	const rated = $derived(ratings(data.stories.map((x) => x.id), matches));
	const pool = $derived(stories.map((x) => rated.get(x.id)!));
	const ranking = $derived(
		pool.toSorted((a, b) => b.elo - a.elo).map((r) => ({ ...r, title: stories.find((x) => x.id === r.id)!.title }))
	);

	// Random, so only picked in the browser; a new pair after every vote, skip or filter change.
	let shown = $state<string[]>([]);
	const next = () => {
		shown = pool.length >= 2 ? pair(pool) : [];
	};
	$effect(next);
	const duel = $derived(shown.map((id) => stories.find((x) => x.id === id)).filter((x) => x !== undefined));

	let forms: HTMLFormElement[] = $state([]);
	// Two steps so nothing is recorded by accident: ← / → (or a click on the card) only selects,
	// Enter or the card's "Choose" button records. Esc clears; ↓ or S skips.
	let selected = $state<number | null>(null);
	$effect(() => {
		shown; // a new pair clears the selection
		selected = null;
	});
	function key(e: KeyboardEvent) {
		if (e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement).closest('input, select, textarea, button, a, summary')) return;
		const actions: Record<string, () => void> = {
			ArrowLeft: () => (selected = 0),
			ArrowRight: () => (selected = 1),
			Escape: () => (selected = null),
			Enter: () => selected !== null && forms[selected]?.requestSubmit(),
			ArrowDown: next,
			s: next
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
			<select name="status" value={status} onchange={submit}>
				<option value="open">Not yet solved</option>
				<option value="">Any</option>
				{#each STATUSES as s (s)}<option value={s}>{s}</option>{/each}
			</select></label
		>
		<label
			>in
			<select name="v" value={version} onchange={submit}>
				{#each SPEC_VERSIONS as v (v)}<option value={v}>{v}</option>{/each}
			</select></label
		>
		<label
			>Ranking
			<select name="class" value={cls} onchange={submit}>
				<option value="">Overall</option>
				<optgroup label="User class">
					{#each classes as c (c)}<option value={c}>{c}</option>{/each}
				</optgroup>
				<optgroup label="Within one RFC">
					{#each rfcs as r (r)}<option value={r}>{r}</option>{/each}
				</optgroup>
			</select></label
		>
	</form>
</div>

{#if __STATIC__}
	<aside class="demo">
		<strong>Demo.</strong> Votes made here stay in your browser and are not part of the public ranking.
		To add them, download them and follow <a href={GUIDE} target="_blank" rel="noopener">the instructions on GitHub ↗</a>.
		<span class="demo-actions">
			<button class="button" onclick={download} disabled={!mine.length}>Download my votes ({mine.length})</button>
			<button class="button" onclick={() => confirm('Forget your votes in this browser?') && keep([])} disabled={!mine.length}>Clear</button>
		</span>
	</aside>
{/if}

<section class="arena">
	<h2 class="question">Which user story do you prefer?</h2>

	{#if duel.length === 2}
		<div class="pair">
			{#each duel as story, i (story.id)}
				<!-- Short version = first paragraph; the rest is behind "Full story". -->
				{@const [short, ...rest] = story.statement.split('\n\n')}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<div class="card" class:selected={selected === i} onclick={() => (selected = i)}>
					<span class="meta">
						<a href="{base}/stories/{story.id}" target="_blank" rel="noopener">{story.id} ↗</a>
						<span class="status"
							><i style:background={statusColour(story.status[version])}></i>{story.status[version]}</span
						>
					</span>
					<strong>{story.title}</strong>
					<span class="statement">
						{#each short.split('\n') as line, j (j)}{@const m = line.match(lead)}<span>{#if m}<b>{m[0]}</b>{line.slice(m[0].length)}{:else}{line}{/if}</span>{/each}
					</span>
					{#if rest.length}
						<details class="more">
							<summary>Full story</summary>
							<span class="statement">
								{#each rest.join('\n\n').split('\n') as line, j (j)}<span>{line}</span>{/each}
							</span>
						</details>
					{/if}
					<form
						method="POST"
						use:enhance={({ formData, cancel }) => {
							if (__STATIC__) {
								cancel();
								const f = (k: string) => String(formData.get(k));
								keep([...mine, { winner: f('winner'), loser: f('loser'), at: new Date().toISOString(), cls: f('class') }]);
							}
						}}
						bind:this={forms[i]} class="choose">
						<input type="hidden" name="winner" value={story.id} />
						<input type="hidden" name="loser" value={duel[1 - i].id} />
						<input type="hidden" name="class" value={cls} />
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
			<button class="button" onclick={next}>Skip <kbd>↓</kbd></button>
			<span class="muted">{matches.length} comparisons in {cls || 'the overall ranking'} · keys: <kbd>←</kbd>/<kbd>→</kbd> select, <kbd>Enter</kbd> confirm, <kbd>Esc</kbd> clear, <kbd>↓</kbd> or <kbd>S</kbd> skip</span>
		</div>
	{:else if pool.length < 2}
		<p class="muted">Fewer than two stories match this filter.</p>
	{/if}
</section>

<details>
	<summary>Ranking: {cls || 'overall'} ({ranking.length} stories)</summary>
	<ol class="ranking">
		{#each ranking as r (r.id)}
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
	.demo { margin-top: 1rem; padding: 0.9rem 1.1rem; border: 1px solid var(--accent); border-radius: 8px; background: var(--surface); line-height: 1.5; }
	.demo-actions { display: flex; gap: 0.5rem; margin-top: 0.6rem; }

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
	.statement b { font-weight: 600; color: var(--text); }
	.more summary { cursor: pointer; font-size: 0.85rem; color: var(--muted); }
	.more .statement { margin-top: 0.4rem; font-size: 0.9rem; }
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
