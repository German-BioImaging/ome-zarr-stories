<script lang="ts">
	import { tick } from 'svelte';
	import { patchStory } from '#lib/api.ts';
	import type { Story } from '#lib/schema.ts';

	// The story's RFCs as chips: × removes one, + adds one. Each change is saved at once.
	let { story, known }: { story: Story; known: string[] } = $props();

	let adding = $state(false);
	let draft = $state('');
	let input = $state<HTMLInputElement>();

	const suggestions = $derived(known.filter((rfc) => !story.rfcs.includes(rfc)));
	const listId = $derived(`rfcs-${story.id}`);

	const save = (rfcs: string[]) => patchStory(story.id, { rfcs: rfcs.join('; ') });

	async function open() {
		adding = true;
		await tick();
		input?.focus();
	}

	function add() {
		// Accept "5", "rfc 5" or "RFC-5".
		const number = draft.match(/\d+/)?.[0];
		const rfc = number && `RFC-${Number(number)}`;
		draft = '';
		adding = false;
		if (rfc && !story.rfcs.includes(rfc)) save([...story.rfcs, rfc]);
	}
</script>

<span class="rfcs">
	{#each story.rfcs as rfc (rfc)}
		<span class="chip">
			<a href="/?rfc={rfc}" title="All stories for {rfc}">{rfc}</a>
			<button
				aria-label="Remove {rfc} from {story.id}"
				onclick={() => save(story.rfcs.filter((other) => other !== rfc))}>×</button
			>
		</span>
	{/each}
	{#if adding}
		<input
			bind:this={input}
			bind:value={draft}
			list={listId}
			placeholder="RFC-…"
			aria-label="Add an RFC to {story.id}"
			onkeydown={(e) => {
				if (e.key === 'Enter') add();
				if (e.key === 'Escape') {
					draft = '';
					adding = false;
				}
			}}
			onblur={add}
		/>
		<datalist id={listId}>
			{#each suggestions as rfc (rfc)}<option value={rfc}></option>{/each}
		</datalist>
	{:else}
		<button class="add" aria-label="Add an RFC to {story.id}" title="Add an RFC" onclick={open}
			>+</button
		>
	{/if}
</span>

<style>
	.rfcs {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		padding: 0 2px 0 8px;
		border: 1px solid var(--line);
		border-radius: 999px;
		font-size: 12px;
		white-space: nowrap;
		background: var(--surface);
	}
	.chip a {
		color: var(--text);
	}
	button {
		border: 0;
		background: none;
		cursor: pointer;
		color: var(--muted);
		padding: 0 5px;
		border-radius: 999px;
		line-height: 18px;
	}
	button:hover {
		color: var(--text);
		background: var(--hover);
	}
	.chip button:hover {
		color: var(--danger);
	}
	.add {
		border: 1px dashed var(--line);
		font-size: 12px;
		padding: 0 7px;
	}
	/* Only show the + on the row being hovered or focused, so the table stays calm. */
	:global(tr:not(:hover):not(:focus-within)) .add {
		opacity: 0;
	}
	input {
		width: 80px;
		padding: 0 6px;
		font-size: 12px;
		border-radius: 999px;
	}
</style>
