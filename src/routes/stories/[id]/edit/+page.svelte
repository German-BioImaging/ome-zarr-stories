<script lang="ts">
	import { resolve } from '$app/paths';
	const base = resolve('/').replace(/\/$/, ''); // '' locally, '/ngff-stories' on GitHub Pages
	import StoryForm from '#lib/components/StoryForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const id = $derived(data.values.id);
</script>

<svelte:head><title>Edit {id}</title></svelte:head>

<p class="crumbs"><a href="{base}/stories/{id}">← {id}</a></p>
<h1>Edit {id}</h1>

<div class="card">
	<StoryForm
		values={form?.values ?? data.values}
		errors={form?.errors}
		stories={data.stories}
		cancelHref="/stories/{id}"
		submitLabel="Save"
	/>
</div>

<style>
	.crumbs {
		margin: 0 0 12px;
	}
	.card {
		margin-top: 16px;
		padding: 20px;
		max-width: 900px;
	}
</style>
