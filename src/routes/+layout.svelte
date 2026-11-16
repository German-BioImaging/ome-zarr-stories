<script lang="ts">
	import { resolve } from '$app/paths';
	const base = resolve('/').replace(/\/$/, ''); // '' locally, '/ngff-stories' on GitHub Pages
	import '../app.css';
	import { refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import { notice } from '#lib/notice.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		{ href: `${base}/`, label: 'Stories' },
		...(__STATIC__ ? [] : [{ href: `${base}/board`, label: 'Board' }]),
		{ href: `${base}/arena`, label: 'Arena' },
		{ href: `${base}/map`, label: 'Map' },
		{ href: `${base}/progress`, label: 'Progress' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Pick up changes made to the file outside the app (an editor, git pull) when coming back. -->
<svelte:window onfocus={() => __STATIC__ || refreshAll()} />

<header>
	<a class="brand" href="{base}/">OME-Zarr user stories</a>
	<nav aria-label="Views">
		{#each links as link (link.href)}
			<a href={link.href} aria-current={page.url.pathname === link.href || `${page.url.pathname}/` === link.href ? 'page' : undefined}
				>{link.label}</a
			>
		{/each}
	</nav>
	<span class="notice" class:error={notice.error} role="status">{notice.text}</span>
	{#if !__STATIC__}<a class="button primary" href="{base}/stories/new">+ Add story</a>{/if}
</header>

<main>
	{@render children()}
</main>

<style>
	header {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 10px 20px;
		background: var(--surface);
		border-bottom: 1px solid var(--line);
	}
	.brand {
		font-weight: 700;
		font-size: 15px;
		color: var(--text);
	}
	nav {
		display: flex;
		gap: 4px;
	}
	nav a {
		padding: 4px 10px;
		border-radius: 6px;
		color: var(--muted);
	}
	nav a:hover {
		background: var(--hover);
		text-decoration: none;
	}
	nav a[aria-current] {
		color: var(--text);
		background: var(--hover);
		font-weight: 600;
	}
	.notice {
		margin-left: auto;
		font-size: 13px;
		color: var(--muted);
	}
	.notice.error {
		color: var(--danger);
	}
	main {
		max-width: 1400px;
		margin: 0 auto;
		padding: 20px;
	}
</style>
