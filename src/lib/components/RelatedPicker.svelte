<script lang="ts">
	import { untrack } from 'svelte';
	import type { Story } from '#lib/schema.ts';

	let { value, stories, self }: { value: string; stories: Story[]; self: string } = $props();

	// Editing state starts from the saved value and is then owned by this form.
	let ids = $state(untrack(() => value.split(';').map((id) => id.trim()).filter(Boolean)));
	let query = $state('');

	const titles = $derived(new Map(stories.map((s) => [s.id, s.title])));
	const candidates = $derived(stories.filter((s) => s.id !== self && !ids.includes(s.id)));

	function add() {
		const id = query.match(/STORY-\d+/)?.[0];
		if (id && candidates.some((s) => s.id === id)) {
			ids.push(id);
			query = '';
		}
	}
</script>

<input type="hidden" name="related" value={ids.join('; ')} />

{#if ids.length}
	<ul>
		{#each ids as id (id)}
			<li>
				<span><strong>{id}</strong> {titles.get(id) ?? '(unknown story)'}</span>
				<button
					type="button"
					aria-label="Remove {id}"
					onclick={() => (ids = ids.filter((other) => other !== id))}>×</button
				>
			</li>
		{/each}
	</ul>
{/if}

<input
	list="related-candidates"
	placeholder="Type an ID or title to link a story…"
	aria-label="Add a related story"
	bind:value={query}
	oninput={add}
	onkeydown={(e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			add();
		}
	}}
/>
<datalist id="related-candidates">
	{#each candidates as story (story.id)}
		<option value="{story.id} {story.title}"></option>
	{/each}
</datalist>

<style>
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 4px;
	}
	li {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		padding: 4px 4px 4px 10px;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
	}
	button {
		border: 0;
		background: none;
		cursor: pointer;
		color: var(--muted);
		padding: 0 6px;
		border-radius: 4px;
	}
	button:hover {
		color: var(--danger);
		background: var(--hover);
	}
</style>
