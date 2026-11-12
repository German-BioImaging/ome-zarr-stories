<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import RfcEditor from '#lib/components/RfcEditor.svelte';
	import StatusSelect from '#lib/components/StatusSelect.svelte';
	import ScoreSelect from '#lib/components/ScoreSelect.svelte';
	import {
		LABELS,
		LATEST_VERSION,
		MOSCOW,
		SPEC_VERSIONS,
		STATUSES,
		USER_CLASSES,
		score,
		statusColumn,
		type Story
	} from '#lib/schema.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Filters and sorting live in the address bar, so a view can be bookmarked or shared.
	const NONE = 'none';
	const SOLVED = 'Standardized';
	const param = (key: string) => page.url.searchParams.get(key) ?? '';
	const filters = $derived({
		moscow: param('priority'),
		status: param('status'),
		userClass: param('class'),
		rfc: param('rfc'),
		by: param('by'),
		// "Solved" = standardized in the latest spec version.
		hideSolved: param('hide') === 'solved'
	});
	const sort = $derived({ key: param('sort') || 'id', descending: param('dir') === 'desc' });
	let search = $state(param('q'));

	function setParams(changes: Record<string, string>) {
		const url = new URL(page.url.href);
		for (const [key, value] of Object.entries(changes)) {
			if (value) url.searchParams.set(key, value);
			else url.searchParams.delete(key);
		}
		goto(url, { replace: true, reset: false });
	}
	const toggle = (key: string, value: string) => setParams({ [key]: param(key) === value ? '' : value });
	const filtered = $derived(search !== '' || Object.values(filters).some(Boolean));
	function clear() {
		search = '';
		setParams({ q: '', priority: '', status: '', class: '', rfc: '', by: '', hide: '' });
	}

	const columns: { key: string; label: string; value: (s: Story) => string | number | null }[] = [
		{ key: 'id', label: 'ID', value: (s) => s.id },
		{ key: 'title', label: 'Story', value: (s) => s.title.toLowerCase() },
		{ key: 'by', label: 'Requested by', value: (s) => s.requested_by[0]?.toLowerCase() ?? null },
		{ key: 'rfcs', label: 'RFCs', value: (s) => s.rfcs[0] ?? null },
		...SPEC_VERSIONS.map((version) => ({
			key: statusColumn(version),
			label: version,
			value: (s: Story) => STATUSES.indexOf(s.status[version])
		})),
		{ key: 'moscow', label: 'Priority', value: (s) => (s.moscow ? MOSCOW.indexOf(s.moscow) : null) },
		{ key: 'value', label: 'Value', value: (s) => s.value },
		{ key: 'effort', label: 'Effort', value: (s) => s.effort },
		{ key: 'score', label: 'Score', value: score }
	];

	const visible = $derived.by(() => {
		const needle = search.trim().toLowerCase();
		const value = (columns.find((c) => c.key === sort.key) ?? columns[0]).value;
		const direction = sort.descending ? -1 : 1;
		return data.stories
			.filter(
				(s) =>
					(!filters.moscow || (filters.moscow === NONE ? !s.moscow : s.moscow === filters.moscow)) &&
					(!filters.status || s.status[LATEST_VERSION] === filters.status) &&
					(!filters.userClass ||
						(filters.userClass === NONE
							? !s.user_classes.length
							: s.user_classes.includes(filters.userClass))) &&
					(!filters.rfc || s.rfcs.includes(filters.rfc)) &&
					(!filters.by || s.requested_by.includes(filters.by)) &&
					!(filters.hideSolved && s.status[LATEST_VERSION] === SOLVED) &&
					(!needle || JSON.stringify(s).toLowerCase().includes(needle))
			)
			.sort((a, b) => {
				const x = value(a);
				const y = value(b);
				if (x === y) return a.id < b.id ? -1 : 1;
				if (x === null) return 1; // blanks always last
				if (y === null) return -1;
				return (x < y ? -1 : 1) * direction;
			});
	});

	const count = (test: (s: Story) => boolean) => data.stories.filter(test).length;
	const priorities = $derived([
		...MOSCOW.map((m) => ({ value: m, label: m, n: count((s) => s.moscow === m) })),
		{ value: NONE, label: 'Not prioritized', n: count((s) => !s.moscow) }
	]);
	const statuses = $derived(
		STATUSES.map((status) => ({ value: status, n: count((s) => s.status[LATEST_VERSION] === status) }))
	);
	const unique = (pick: (s: Story) => string[]) => [...new Set(data.stories.flatMap(pick))].sort();
	const rfcs = $derived(unique((s) => s.rfcs));
	const requesters = $derived(unique((s) => s.requested_by));
</script>

<svelte:head><title>OME-Zarr user stories</title></svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key === '/' && !(e.target instanceof HTMLElement && e.target.matches('input, textarea, select'))) {
			e.preventDefault();
			document.getElementById('search')?.focus();
		}
	}}
/>

<section class="filters" aria-label="Filters">
	<div class="chips">
		<h2>Priority</h2>
		{#each priorities as chip (chip.value)}
			<button
				class="chip"
				aria-pressed={filters.moscow === chip.value}
				onclick={() => toggle('priority', chip.value)}>{chip.label} <b>{chip.n}</b></button
			>
		{/each}
	</div>
	<div class="chips">
		<h2>Status in {LATEST_VERSION}</h2>
		{#each statuses as chip (chip.value)}
			<button
				class="chip"
				aria-pressed={filters.status === chip.value}
				onclick={() => toggle('status', chip.value)}>{chip.value} <b>{chip.n}</b></button
			>
		{/each}
	</div>
	<div class="row">
		<input
			id="search"
			type="search"
			placeholder="Search all fields…  ( / )"
			bind:value={search}
			oninput={() => setParams({ q: search })}
		/>
		<select
			aria-label="Filter by user class"
			value={filters.userClass}
			onchange={(e) => setParams({ class: e.currentTarget.value })}
		>
			<option value="">Any user class</option>
			{#each USER_CLASSES as userClass (userClass.name)}<option>{userClass.name}</option>{/each}
			<option value={NONE}>No user class</option>
		</select>
		<select
			aria-label="Filter by RFC"
			value={filters.rfc}
			onchange={(e) => setParams({ rfc: e.currentTarget.value })}
		>
			<option value="">Any RFC</option>
			{#each rfcs as rfc (rfc)}<option>{rfc}</option>{/each}
		</select>
		<select
			aria-label="Filter by requester"
			value={filters.by}
			onchange={(e) => setParams({ by: e.currentTarget.value })}
		>
			<option value="">Anyone</option>
			{#each requesters as name (name)}<option>{name}</option>{/each}
		</select>
		<label class="toggle">
			<input
				type="checkbox"
				checked={filters.hideSolved}
				onchange={(e) => setParams({ hide: e.currentTarget.checked ? 'solved' : '' })}
			/>
			Hide {SOLVED.toLowerCase()} in {LATEST_VERSION}
		</label>
		{#if filtered}<button class="button" onclick={clear}>Clear filters</button>{/if}
		<span class="muted count">
			{visible.length === data.stories.length
				? `${data.stories.length} stories`
				: `${visible.length} of ${data.stories.length} stories`}
		</span>
	</div>
</section>

<div class="card table">
	<table>
		<thead>
			<tr>
				{#each columns as column (column.key)}
					{@const active = sort.key === column.key}
					<th
						aria-sort={active ? (sort.descending ? 'descending' : 'ascending') : undefined}
						title={LABELS[column.key]}
					>
						<button
							onclick={() =>
								setParams({
									sort: column.key,
									dir: active && !sort.descending ? 'desc' : ''
								})}
							>{column.label}{#if active}<span aria-hidden="true">
									{sort.descending ? '↓' : '↑'}</span
								>{/if}</button
						>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each visible as story (story.id)}
				<tr>
					<td class="id">{story.id}</td>
					<td class="story">
						<a href="/stories/{story.id}">{story.title}</a>
						<p class="muted">{story.statement}</p>
						{#if story.user_classes.length}
							<p class="classes">{story.user_classes.join(' · ')}</p>
						{/if}
					</td>
					<td>{story.requested_by.join(', ')}</td>
					<td><RfcEditor {story} known={rfcs} /></td>
					{#each SPEC_VERSIONS as version (version)}
						<td><StatusSelect {story} {version} /></td>
					{/each}
					<td><ScoreSelect {story} field="moscow" /></td>
					<td><ScoreSelect {story} field="value" /></td>
					<td><ScoreSelect {story} field="effort" /></td>
					<td class="score">{score(story) ?? ''}</td>
				</tr>
			{:else}
				<tr><td colspan={columns.length} class="muted empty">No stories match these filters.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.filters {
		display: grid;
		gap: 10px;
		margin-bottom: 16px;
	}
	.chips,
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}
	.chips h2 {
		width: 110px;
	}
	.chip {
		padding: 2px 10px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface);
		cursor: pointer;
	}
	.chip:hover {
		background: var(--hover);
	}
	.chip b {
		color: var(--muted);
		font-weight: 600;
		margin-left: 2px;
	}
	.chip[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
	}
	.chip[aria-pressed='true'] b {
		color: inherit;
	}
	.toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 6px;
		cursor: pointer;
		white-space: nowrap;
	}
	#search {
		flex: 1 1 240px;
		max-width: 360px;
	}
	.count {
		margin-left: auto;
	}

	.table {
		overflow-x: auto;
	}
	table {
		border-collapse: collapse;
		width: 100%;
	}
	th,
	td {
		padding: 8px 10px;
		text-align: left;
		vertical-align: top;
		border-bottom: 1px solid var(--line);
	}
	tbody tr:last-child td {
		border-bottom: 0;
	}
	tbody tr:hover {
		background: var(--hover);
	}
	th {
		padding: 4px;
		white-space: nowrap;
	}
	th button {
		border: 0;
		background: none;
		padding: 4px 6px;
		border-radius: 4px;
		font-weight: 600;
		font-size: 12px;
		color: var(--muted);
		cursor: pointer;
	}
	th button:hover,
	th[aria-sort] button {
		color: var(--text);
	}
	.id {
		white-space: nowrap;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.story {
		min-width: 320px;
	}
	.story a {
		font-weight: 600;
		color: var(--text);
	}
	.story a:hover {
		color: var(--accent);
	}
	.story p {
		margin: 2px 0 0;
		font-size: 13px;
	}
	.story p.muted {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
	}
	.classes {
		font-size: 12px !important;
		color: var(--accent);
	}
	.score {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		padding-top: 11px;
	}
	.empty {
		padding: 32px;
		text-align: center;
	}
</style>
