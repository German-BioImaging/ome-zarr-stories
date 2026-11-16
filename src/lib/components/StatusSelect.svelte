<script lang="ts">
	import { patchStory } from '#lib/api.ts';
	import { STATUSES, statusColour, statusColumn, statusDescription, type Story } from '#lib/schema.ts';

	// Looks like a status badge; click it to pick another status, saved at once.
	let { story, version }: { story: Story; version: string } = $props();

	const current = $derived(story.status[version]);

	async function change(event: Event & { currentTarget: HTMLSelectElement }) {
		const select = event.currentTarget;
		const saved = await patchStory(story.id, { [statusColumn(version)]: select.value });
		if (!saved) select.value = current;
	}
</script>

<select
	aria-label="Status in {version} of {story.id}"
	value={current}
	onchange={change}
	disabled={__STATIC__}
	title={statusDescription(current)}
	style:--dot={statusColour(current)}
>
	{#each STATUSES as status (status)}
		<option title={statusDescription(status)}>{status}</option>
	{/each}
</select>

<style>
	select:disabled {
		opacity: 1;
		cursor: default;
		appearance: none;
	}
	select {
		appearance: none;
		padding: 1px 22px 1px 20px;
		border-radius: 999px;
		font-size: 12px;
		cursor: pointer;
		color: var(--text);
		border: 1px solid var(--line);
		/* text stays in ink; a status dot (ringed, so "hollow" still shows) carries the colour,
		   plus a small chevron so it reads as editable */
		background:
			radial-gradient(circle at 10px 50%, var(--dot) 4px, var(--muted) 4.5px 5px, transparent 5.5px),
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E")
				no-repeat right 8px center,
			var(--surface);
	}
	select:hover {
		border-color: var(--muted);
	}
	option {
		color: var(--text);
		background: var(--surface);
	}
</style>
