<script lang="ts">
	// Shows text with any http(s) addresses in it as links.
	let { text }: { text: string } = $props();

	const URL_PATTERN = /(https?:\/\/[^\s<>"]*[^\s<>".,;:!?)\]])/;
	const parts = $derived(text.split(URL_PATTERN));
</script>

{#each parts as part, i (i)}{#if i % 2}<a href={part} target="_blank" rel="noopener noreferrer"
			>{part}</a
		>{:else}{part}{/if}{/each}

<style>
	a {
		overflow-wrap: anywhere;
	}
</style>
