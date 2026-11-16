<script lang="ts">
	import { resolve } from '$app/paths';
	const base = resolve('/').replace(/\/$/, ''); // '' locally, '/ngff-stories' on GitHub Pages
	import { enhance } from '$app/forms';
	import { patchStory } from '#lib/api.ts';
	import RfcEditor from '#lib/components/RfcEditor.svelte';
	import StatusSelect from '#lib/components/StatusSelect.svelte';
	import Linkified from '#lib/components/Linkified.svelte';
	import ScoreSelect from '#lib/components/ScoreSelect.svelte';
	import { LABELS, SPEC_VERSIONS, USER_CLASSES, relatedTo, score, statusColumn, today } from '#lib/schema.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const story = $derived(data.story);
	const related = $derived(relatedTo(story, data.stories));
	const knownRfcs = $derived([...new Set(data.stories.flatMap((s) => s.rfcs))].sort());
	const describe = (name: string) => USER_CLASSES.find((c) => c.name === name)?.description;

	function confirmDelete(event: SubmitEvent) {
		const links = related.length
			? `\n\nIt is linked with ${related.map((s) => s.id).join(', ')}; those links will be removed.`
			: '';
		if (!confirm(`Delete ${story.id} "${story.title}"?${links}`)) event.preventDefault();
	}
</script>

<svelte:head><title>{story.id} · {story.title}</title></svelte:head>

<p class="crumbs"><a href="{base}/">← All stories</a></p>

<header>
	<div>
		<p class="muted id">{story.id}</p>
		<h1>{story.title}</h1>
	</div>
	{#if !__STATIC__}
	<div class="actions">
		<a class="button primary" href="{base}/stories/{story.id}/edit">Edit</a>
		<form method="POST" action="?/delete" onsubmit={confirmDelete} use:enhance>
			<button class="button danger">Delete</button>
		</form>
	</div>
	{/if}
</header>

<div class="layout">
	<article class="card">
		<p class="statement"><Linkified text={story.statement} /></p>

		{#if story.workaround}
			<h2>{LABELS.workaround}</h2>
			<p class="pre"><Linkified text={story.workaround} /></p>
		{/if}

		{#if story.notes}
			<h2>{LABELS.notes}</h2>
			<p class="pre"><Linkified text={story.notes} /></p>
		{/if}

		{#if related.length}
			<h2>{LABELS.related}</h2>
			<ul class="plain">
				{#each related as other (other.id)}
					<li><a href="{base}/stories/{other.id}">{other.id}</a> {other.title}</li>
				{/each}
			</ul>
		{/if}

		{#if story.sources.length}
			<h2>{LABELS.sources}</h2>
			<ul class="plain">
				{#each story.sources as source (source)}<li><Linkified text={source} /></li>{/each}
			</ul>
		{/if}

		{#if story.examples.length}
			<h2>{LABELS.examples}</h2>
			<ul class="plain">
				{#each story.examples as example (example)}<li><Linkified text={example} /></li>{/each}
			</ul>
		{/if}
	</article>

	<aside class="card">
		<dl>
			{#if !__STATIC__}
			<dt>{LABELS.moscow}</dt>
			<dd><ScoreSelect {story} field="moscow" /></dd>
			<dt>{LABELS.value}</dt>
			<dd><ScoreSelect {story} field="value" /></dd>
			<dt>{LABELS.effort}</dt>
			<dd><ScoreSelect {story} field="effort" /></dd>
			<dt>Score</dt>
			<dd class="pad" title="Value ÷ effort">{score(story) ?? '–'}</dd>
			{/if}

			{#each SPEC_VERSIONS as version (version)}
				<dt>{LABELS[statusColumn(version)]}</dt>
				<dd><StatusSelect {story} {version} /></dd>
			{/each}

			<dt>{LABELS.rfcs}</dt>
			<dd><RfcEditor {story} known={knownRfcs} /></dd>
			<dt>{LABELS.user_classes}</dt>
			<dd class="pad">
				{#each story.user_classes as name (name)}
					<a href="{base}/?class={encodeURIComponent(name)}" title={describe(name)}>{name}</a><br />
				{:else}–{/each}
			</dd>
			<dt>{LABELS.requested_by}</dt>
			<dd class="pad">
				{#each story.requested_by as name (name)}
					<a href="{base}/?by={encodeURIComponent(name)}">{name}</a>{' '}
				{:else}–{/each}
			</dd>
			<dt>{LABELS.origin}</dt>
			<dd class="pad">
				{#if story.origin}
					<a href={story.origin} target="_blank" rel="noopener noreferrer">Open ↗</a>
				{:else}–{/if}
			</dd>
			<dt>{LABELS.reviewed}</dt>
			<dd class="pad">
				{story.reviewed || '–'}
				{#if !__STATIC__ && story.reviewed !== today()}
					<button class="link" onclick={() => patchStory(story.id, { reviewed: today() })}
						>Mark reviewed today</button
					>
				{/if}
			</dd>
		</dl>
	</aside>
</div>

<style>
	.crumbs {
		margin: 0 0 12px;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 16px;
		margin-bottom: 16px;
	}
	.id {
		margin: 0;
		font-size: 13px;
	}
	.actions {
		display: flex;
		gap: 8px;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
		gap: 16px;
		align-items: start;
	}
	article,
	aside {
		padding: 16px 20px;
	}
	.statement {
		margin: 0;
		font-size: 15px;
		white-space: pre-wrap;
	}
	.pre {
		white-space: pre-wrap;
	}
	h2 {
		margin: 20px 0 4px;
	}
	article p {
		margin-bottom: 0;
	}
	.plain {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.plain li {
		padding: 2px 0;
	}
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px 12px;
		margin: 0;
		align-items: baseline;
	}
	dt {
		color: var(--muted);
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
	}
	dd {
		margin: 0;
	}
	dd.pad {
		padding: 3px 5px;
	}
	.link {
		display: block;
		border: 0;
		background: none;
		padding: 0;
		color: var(--accent);
		cursor: pointer;
		font-size: 12px;
	}
	.link:hover {
		text-decoration: underline;
	}
	@media (max-width: 800px) {
		.layout {
			grid-template-columns: 1fr;
		}
	}
</style>
