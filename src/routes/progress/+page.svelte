<script lang="ts">
	import { SPEC_VERSIONS, STATUSES, statusColour, statusDescription, isSolved } from '#lib/schema.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// One row per version: how many stories sit at each status, worst to best.
	const rows = $derived(
		SPEC_VERSIONS.map((version) => {
			const counts = STATUSES.map((status) => ({
				status,
				n: data.stories.filter((s) => s.status[version] === status).length
			}));
			const solved = counts.filter((c) => isSolved(c.status)).reduce((sum, c) => sum + c.n, 0);
			return { version, counts, solved };
		})
	);
	const total = $derived(data.stories.length);
	const pct = (n: number) => `${((n / total) * 100).toFixed(2)}%`;
	const link = (version: string, status: string) =>
		`/?v=${encodeURIComponent(version)}&status=${encodeURIComponent(status)}`;
</script>

<svelte:head><title>Progress · OME-Zarr user stories</title></svelte:head>

<h1>Status by spec version</h1>
<p class="muted">Share of the {total} stories at each status. Click a segment to list those stories.</p>

<ul class="legend" aria-label="Statuses">
	{#each STATUSES as status (status)}
		<li title={statusDescription(status)}><i style:background={statusColour(status)}></i>{status}</li>
	{/each}
</ul>

<div class="card chart">
	{#each rows as row (row.version)}
		<div class="row">
			<span class="version">{row.version}</span>
			<div class="bar" role="group" aria-label="Statuses in {row.version}">
				{#each row.counts.filter((c) => c.n) as c (c.status)}
					<a
						href={link(row.version, c.status)}
						style:flex-basis={pct(c.n)}
						style:background={statusColour(c.status)}
						class:hollow={statusColour(c.status) === 'var(--hollow)'}
						aria-label="{c.status}: {c.n} stories in {row.version}"
						data-tip="{c.status} · {c.n} ({Math.round((c.n / total) * 100)}%)"
					></a>
				{/each}
			</div>
			<span class="solved">{row.solved} solved</span>
		</div>
	{/each}
</div>

<details>
	<summary>Table</summary>
	<div class="card table">
		<table>
			<thead>
				<tr><th>Status</th>{#each rows as row (row.version)}<th>{row.version}</th>{/each}</tr>
			</thead>
			<tbody>
				{#each STATUSES as status, i (status)}
					<tr>
						<td><i style:background={statusColour(status)}></i>{status}</td>
						{#each rows as row (row.version)}
							<td class="n"><a href={link(row.version, status)}>{row.counts[i].n}</a></td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</details>

<style>
	h1 {
		margin: 0 0 4px;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 14px;
		list-style: none;
		padding: 0;
		margin: 12px 0;
		font-size: 13px;
	}
	i {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		margin-right: 6px;
		vertical-align: -1px;
		border: 1px solid color-mix(in srgb, var(--muted) 60%, transparent);
	}
	.chart {
		padding: 16px 20px;
		display: grid;
		gap: 14px;
	}
	.row {
		display: grid;
		grid-template-columns: 56px 1fr 80px;
		align-items: center;
		gap: 12px;
	}
	.version {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.solved {
		color: var(--muted);
		font-size: 13px;
		text-align: right;
	}
	.bar {
		display: flex;
		gap: 2px; /* surface gap between segments */
		height: 28px;
	}
	.bar a {
		position: relative;
		min-width: 4px;
		flex-grow: 0;
		flex-shrink: 1;
	}
	.bar a:first-child {
		border-radius: 4px 0 0 4px;
	}
	.bar a:last-child {
		border-radius: 0 4px 4px 0;
	}
	.bar a.hollow {
		box-shadow: inset 0 0 0 1px var(--muted);
	}
	.bar a:hover,
	.bar a:focus-visible {
		outline: 2px solid var(--text);
		outline-offset: 1px;
		z-index: 1;
	}
	/* hover tooltip */
	.bar a:hover::after,
	.bar a:focus-visible::after {
		content: attr(data-tip);
		position: absolute;
		bottom: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
		white-space: nowrap;
		padding: 4px 8px;
		border-radius: 6px;
		background: var(--text);
		color: var(--surface);
		font-size: 12px;
		pointer-events: none;
	}
	details {
		margin-top: 16px;
	}
	summary {
		cursor: pointer;
		color: var(--muted);
		margin-bottom: 8px;
	}
	table {
		border-collapse: collapse;
		width: 100%;
	}
	th,
	td {
		padding: 6px 12px;
		text-align: left;
		border-bottom: 1px solid var(--line);
	}
	th {
		font-size: 12px;
		color: var(--muted);
	}
	.n {
		font-variant-numeric: tabular-nums;
	}
	.n a {
		color: var(--text);
	}
	@media (max-width: 640px) {
		.row {
			grid-template-columns: 48px 1fr;
		}
		.solved {
			grid-column: 2;
			text-align: left;
		}
	}
</style>
