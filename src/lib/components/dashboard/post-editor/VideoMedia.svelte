<script lang="ts">
	import { showConfirmDialog } from '$lib/components/AlertDialog.svelte';
	import type { VideoMediaData } from '@/lib/entities/media/video';
	import AltTextEditor from './AltTextEditor.svelte';
	import MediaOverlayControls from './MediaOverlayControls.svelte';
	import RemoveMediaButton from './RemoveMediaButton.svelte';

	interface Props {
		video: VideoMediaData;
		setCaptions: (file: File | undefined) => void;
		onClickRemove: () => void;
	}

	let { video = $bindable(), setCaptions, onClickRemove }: Props = $props();

	let altTextEditorOpen = $state(false);

	let captionsInput: HTMLInputElement;

	function onCaptionsInputChange() {
		if (!captionsInput.files || captionsInput.files.length === 0) return;

		setCaptions(captionsInput.files[0]);
	}
</script>

<div class="video-media">
	<div class="video-container">
		{#await video.videoBlob.url then videoSrc}
			{#if video.videoBlob.meta.mimeType.startsWith('image/')}
				<img src={videoSrc} alt={video.alt} />
			{:else}
				<video
					src={videoSrc}
					controls
					controlslist="nofullscreen nodownload noremoteplayback"
					autoplay
					loop
					muted
					playsinline
					disablepictureinpicture
					disableremoteplayback
				>
					{#if video.captionsBlob}
						{#await video.captionsBlob.url then captionsSrc}
							<track default kind="captions" src={captionsSrc} />
						{/await}
					{/if}
				</video>
			{/if}
		{/await}

		<MediaOverlayControls>
			{#snippet topRight()}
				<RemoveMediaButton {onClickRemove} />
			{/snippet}
		</MediaOverlayControls>
	</div>

	<div class="accessibility-controls">
		<button
			class={['captions-button', { 'checkmark-prefix': !!video.captionsBlob }]}
			type="button"
			onclick={() => {
				if (video.captionsBlob) {
					showConfirmDialog({
						text: ['Delete the captions?'],
						confirm: {
							text: 'Delete',
							class: 'danger',
							onClick: () => setCaptions(undefined)
						}
					});
				} else {
					captionsInput.click();
				}
			}}>Captions</button
		>
		<input
			type="file"
			bind:this={captionsInput}
			accept="text/vtt"
			onchange={onCaptionsInputChange}
			hidden
		/>
		<button
			class={['alt-text-button', { 'checkmark-prefix': !!video.alt }]}
			type="button"
			onclick={() => (altTextEditorOpen = true)}>Alt Text</button
		>
	</div>
</div>

<AltTextEditor bind:open={altTextEditorOpen} bind:media={video} maxGraphemes={1000} />

<style>
	.video-media {
		display: flex;
		flex-direction: column;
		gap: 8px;

		.video-container {
			position: relative;
			background-color: black;
			border-radius: 8px;
			container: video-media / inline-size;

			video,
			img {
				border-radius: 8px;
				display: block;
				width: 100%;
				max-height: 100cqw;
			}
		}

		.accessibility-controls {
			display: flex;
			flex-direction: row;
			gap: 8px;
		}
	}
</style>
