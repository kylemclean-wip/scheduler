<script lang="ts">
	import type { Snippet } from 'svelte';

	let { topLeft, topRight, main }: { topLeft?: Snippet; topRight?: Snippet; main?: Snippet } =
		$props();
</script>

<div class="overlay-controls">
	<div class="top-row">
		<div class={['top-row-left', { 'all-pointer-events': !!topLeft }]}>
			{#if topLeft}
				{@render topLeft()}
			{:else}
				<div></div>
			{/if}
		</div>
		<div class={['top-row-right', { 'all-pointer-events': !!topRight }]}>
			{#if topRight}
				{@render topRight()}
			{:else}
				<div></div>
			{/if}
		</div>
	</div>
	<div class={['main', { 'all-pointer-events': !!main }]}>
		{#if main}
			{@render main()}
		{:else}
			<div></div>
		{/if}
	</div>
</div>

<style>
	.overlay-controls {
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		pointer-events: none;

		.all-pointer-events {
			pointer-events: all;
		}

		.main {
			flex: 1;
		}

		.top-row {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			padding: 4px;
			min-height: 40px;

			.top-row-left,
			.top-row-right {
				display: contents;
			}

			:global(button) {
				background-color: rgba(0, 0, 0, 0.75);
				color: white;
				border: none;
				border-radius: 8px;
				padding: 4px;
				font-size: 0.9rem;
			}
		}
	}
</style>
