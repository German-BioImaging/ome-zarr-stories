<script lang="ts">
	import { resolve } from '$app/paths';
	const base = resolve('/').replace(/\/$/, ''); // '' locally, '/ngff-stories' on GitHub Pages
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.error?.message}</title></svelte:head>

<h1>{page.error?.message}</h1>

{#if page.error?.issues}
	<p>Fix these in <code>user-stories.tsv</code>, then reload. Nothing was changed.</p>
	<ul>
		{#each page.error.issues as issue (issue)}
			<li>{issue}</li>
		{/each}
	</ul>
{:else}
	<p><a href="{base}/">Back to the stories</a></p>
{/if}

<style>
	h1 {
		margin-bottom: 12px;
	}
	li {
		font-family: ui-monospace, monospace;
		font-size: 13px;
		margin-bottom: 4px;
	}
</style>
