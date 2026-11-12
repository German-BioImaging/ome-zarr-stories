<script lang="ts">
	import { patchStory } from '#lib/api.ts';
	import ScoreSelect from '#lib/components/ScoreSelect.svelte';
	import { MOSCOW, score, type Story } from '#lib/schema.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Within a column: best score first, unscored last.
	const ranked = (stories: Story[]) =>
		stories.toSorted((a, b) => (score(b) ?? -1) - (score(a) ?? -1) || (a.id < b.id ? -1 : 1));
	const columns = $derived(
		[...MOSCOW, ''].map((moscow) => ({
			moscow,
			label: moscow || 'Not prioritized',
			stories: ranked(data.stories.filter((s) => s.moscow === moscow))
		}))
	);

	let over = $state<string | null>(null);

	function drop(event: DragEvent, moscow: string) {
		event.preventDefault();
		over = null;
		const id = event.dataTransfer?.getData('text/plain');
		const story = data.stories.find((s) => s.id === id);
		if (story && story.moscow !== moscow) patchStory(story.id, { moscow });
	}
</script>

<svelte:head><title>Board · OME-Zarr user stories</title></svelte:head>

<p class="muted hint">Drag a story to another column to change its priority, or use the menu on the card.</p>

<div class="board">
	{#each columns as column (column.moscow)}
		<!-- Dragging is a shortcut; the menu on each card does the same from the keyboard. -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<section
			class="column"
			class:over={over === column.moscow}
			ondragover={(e) => {
				e.preventDefault();
				over = column.moscow;
			}}
			ondragleave={(e) => {
				if (!e.currentTarget.contains(e.relatedTarget as Node | null)) over = null;
			}}
			ondrop={(e) => drop(e, column.moscow)}
		>
			<h2>{column.label} <span>{column.stories.length}</span></h2>
			{#each column.stories as story (story.id)}
				<article
					class="card"
					draggable="true"
					ondragstart={(e) => e.dataTransfer?.setData('text/plain', story.id)}
				>
					<a href="/stories/{story.id}" draggable="false">{story.title}</a>
					<footer>
						<span class="muted">{story.id}</span>
						{#if score(story) !== null}
							<span class="muted" title="Value {story.value} ÷ effort {story.effort}"
								>score {score(story)}</span
							>
						{/if}
						<ScoreSelect {story} field="moscow" />
					</footer>
				</article>
			{/each}
		</section>
	{/each}
</div>

<style>
	.hint {
		margin: 0 0 12px;
	}
	.board {
		display: grid;
		grid-template-columns: repeat(5, minmax(200px, 1fr));
		gap: 12px;
		overflow-x: auto;
	}
	.column {
		display: grid;
		gap: 8px;
		padding: 10px;
		border-radius: var(--radius);
		background: var(--hover);
		border: 2px dashed transparent;
		min-height: 60vh; /* a tall drop target even when the column is empty */
		align-content: start;
	}
	.column.over {
		border-color: var(--accent);
	}
	h2 {
		display: flex;
		justify-content: space-between;
		color: var(--text);
	}
	h2 span {
		color: var(--muted);
	}
	article {
		padding: 8px 10px;
		cursor: grab;
	}
	article a {
		color: var(--text);
		font-weight: 600;
		font-size: 13px;
	}
	footer {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 4px;
		font-size: 12px;
	}
	footer :global(select) {
		margin-left: auto;
		font-size: 12px;
	}
</style>
