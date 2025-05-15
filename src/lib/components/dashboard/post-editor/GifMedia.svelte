<script lang="ts">
	import { ExternalLinkIcon } from 'lucide-svelte';
	import AltTextEditor from './AltTextEditor.svelte';
	import MediaOverlayControls from './MediaOverlayControls.svelte';
	import RemoveMediaButton from './RemoveMediaButton.svelte';
	import type { GifMediaData } from '@/lib/entities/media/gif';

	interface Props {
		gif: GifMediaData;
		onClickRemove: () => void;
	}

	let { gif = $bindable(), onClickRemove }: Props = $props();

	let altTextEditorOpen = $state(false);

	function openAltTextEditor() {
		altTextEditorOpen = true;
	}
</script>

<div class="gif-media" data-has-alt-text={gif.alt ? '' : undefined}>
	<div class="image-container">
		<img src={gif.src} alt={gif.alt} />

		<MediaOverlayControls>
			{#snippet topLeft()}
				<button
					type="button"
					onclick={openAltTextEditor}
					aria-label="Set Alt Text"
					class={['alt-button', { 'checkmark-prefix': !!gif.alt }]}>Alt</button
				>
			{/snippet}

			{#snippet topRight()}
				<RemoveMediaButton {onClickRemove} />
			{/snippet}

			{#snippet main()}
				<button
					class="main-button"
					type="button"
					onclick={openAltTextEditor}
					aria-label="Set Alt Text"
				></button>
			{/snippet}
		</MediaOverlayControls>
	</div>

	{#if 'extra' in gif && gif.extra}
		{@const extraUrlIsExternal = new URL(gif.extra.url).host !== location.host}
		<div class="extra">
			<a href={gif.extra.url} target="_blank" rel="noopener noreferrer">
				{gif.extra.text}{#if extraUrlIsExternal}<ExternalLinkIcon size="1rem" />{/if}
			</a>
		</div>
	{/if}
</div>

<AltTextEditor bind:open={altTextEditorOpen} bind:media={gif} maxGraphemes={2000} />

<style>
	.gif-media {
		display: flex;
		flex-direction: column;
		gap: 8px;

		.image-container {
			position: relative;
			background-color: black;
			border-radius: 8px;
			container: gif-media / inline-size;

			img {
				border-radius: 8px;
				display: block;
				width: 100%;
				max-height: 100cqw;
			}
		}

		.alt-button {
			text-transform: uppercase;
			font-weight: bold;
		}

		.main-button {
			background: none;
			border: none;
			width: 100%;
			height: 100%;
		}

		.extra a {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: 0.25rem;
			width: fit-content;
			color: var(--subtle-fg-color);
			font-weight: normal;
		}
	}
</style>
