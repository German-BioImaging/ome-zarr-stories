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
	title={statusDescription(current)}
	style:color={statusColour(current)}
>
	{#each STATUSES as status (status)}
		<option title={statusDescription(status)}>{status}</option>
	{/each}
</select>

<style>
	select {
		appearance: none;
		padding: 1px 22px 1px 8px;
		border-radius: 999px;
		font-size: 12px;
		cursor: pointer;
		border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
		/* the badge tint, plus a small chevron so it reads as editable */
		background:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E")
				no-repeat right 8px center,
			color-mix(in srgb, currentColor 9%, transparent);
	}
	select:hover {
		border-color: currentColor;
	}
	option {
		color: var(--text);
		background: var(--surface);
	}
</style>
