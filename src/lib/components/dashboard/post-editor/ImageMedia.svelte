<script lang="ts">
	import type { ImagesMediaData } from '@/lib/entities/media/images';
	import AltTextEditor from './AltTextEditor.svelte';
	import MediaOverlayControls from './MediaOverlayControls.svelte';
	import RemoveMediaButton from './RemoveMediaButton.svelte';

	interface Props {
		image: ImagesMediaData[number];
		onClickRemove: () => void;
	}

	let { image = $bindable(), onClickRemove }: Props = $props();

	let altTextEditorOpen = $state(false);

	function openAltTextEditor() {
		altTextEditorOpen = true;
	}
</script>

<div class="image-media" data-has-alt-text={image.alt ? '' : undefined}>
	{#await image.imageBlob.url then src}
		<img {src} alt={image.alt} />
	{/await}

	<MediaOverlayControls>
		{#snippet topLeft()}
			<button
				type="button"
				onclick={openAltTextEditor}
				aria-label="Set Alt Text"
				class={['alt-button', { 'checkmark-prefix': !!image.alt }]}>Alt</button
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

<AltTextEditor bind:open={altTextEditorOpen} bind:media={image} maxGraphemes={2000} />

<style>
	.image-media {
		position: relative;
		display: flex;
		flex-direction: column;
		flex: 1;
		aspect-ratio: 1/1;

		img {
			display: block;
			width: 100%;
			height: 100%;
			object-fit: cover;
			border-radius: 8px;
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
	}
</style>
