<script lang="ts">
	import { patchStory } from '#lib/api.ts';
	import { LABELS, MOSCOW, SCORES, type Story } from '#lib/schema.ts';

	let { story, field }: { story: Story; field: 'moscow' | 'value' | 'effort' } = $props();

	const options = $derived(field === 'moscow' ? MOSCOW : SCORES.map(String));
	const current = $derived(String(story[field] ?? ''));

	async function change(event: Event & { currentTarget: HTMLSelectElement }) {
		const select = event.currentTarget;
		const saved = await patchStory(story.id, { [field]: select.value });
		if (!saved) select.value = current;
	}
</script>

<select
	aria-label="{LABELS[field]} of {story.id}"
	value={current}
	onchange={change}
	data-value={current}
>
	<option value="">–</option>
	{#each options as option (option)}
		<option>{option}</option>
	{/each}
</select>

<style>
	select {
		border-color: transparent;
		background: transparent;
		padding: 2px 4px;
		cursor: pointer;
	}
	select:hover {
		border-color: var(--line);
	}
	select[data-value=''] {
		color: var(--muted);
	}
	select[data-value='Must'] {
		color: var(--danger);
		font-weight: 600;
	}
	select[data-value='Should'] {
		color: var(--amber);
	}
	select[data-value='Could'] {
		color: var(--green);
	}
	option {
		color: var(--text);
		font-weight: 400;
	}
</style>
