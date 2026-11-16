<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	const base = resolve('/').replace(/\/$/, '');
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1>Story arena</h1>
<p>Every story here is a real need. If the spec could address only one of these two next, which would have the wider impact? {data.total} comparisons so far.</p>

<div class="pair">
	{#each data.pair as story, i (story.id)}
		<form method="POST" use:enhance>
			<input type="hidden" name="winner" value={story.id} />
			<input type="hidden" name="loser" value={data.pair[1 - i].id} />
			<button class="card">
				<small>{story.id}</small>
				<strong>{story.title}</strong>
				<span>{story.statement.replaceAll('\\n', ' ')}</span>
			</button>
		</form>
	{/each}
</div>

<details>
	<summary>Ranking</summary>
	<ol>
		{#each data.ranking as r (r.id)}
			<li><a href="{base}/stories/{r.id}">{r.id}</a> {r.title} — {Math.round(r.elo)} ({r.games})</li>
		{/each}
	</ol>
</details>

<style>
	.pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 1rem; margin: 1rem 0; }
	.card { display: flex; flex-direction: column; gap: .5rem; width: 100%; height: 100%; text-align: left; padding: 1rem; cursor: pointer; }
</style>
