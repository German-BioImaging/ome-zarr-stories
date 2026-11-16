import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

// STATIC=1 builds a read-only site (no editing) for GitHub Pages; BASE_PATH is the repo path, e.g. /ngff-stories.
const STATIC = !!process.env.STATIC;

export default defineConfig({
	define: { __STATIC__: JSON.stringify(STATIC) },
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// strict: false — the editing routes are not prerendered and simply absent from the static site.
			adapter: STATIC ? adapterStatic({ strict: false }) : adapterNode(),
			paths: { base: (process.env.BASE_PATH ?? '') as '' | `/${string}` }
		})
	],
	test: { include: ['src/**/*.test.ts'] }
});
