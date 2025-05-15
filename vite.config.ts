import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],

	build: {
		// These browsers are the earliest to support top-level await
		target: ['chrome89', 'edge89', 'firefox89', 'safari15']
	},

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
