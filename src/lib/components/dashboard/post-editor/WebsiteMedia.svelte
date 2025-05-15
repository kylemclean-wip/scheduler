<script lang="ts">
	import { EarthIcon } from 'lucide-svelte';
	import MediaOverlayControls from './MediaOverlayControls.svelte';
	import RemoveMediaButton from './RemoveMediaButton.svelte';
	import Separator from '$lib/components/Separator.svelte';
	import { deepAwait } from '@/lib/deep-await';
	import type { EditableWebsiteMediaData } from '@/lib/entities/media/website';

	interface Props {
		website: EditableWebsiteMediaData;
		onClickRemove: (website: EditableWebsiteMediaData) => void;
	}

	const { website, onClickRemove }: Props = $props();

	const metaAndThumbnailPromise = $derived(
		Promise.all([website.meta, deepAwait(website.meta.thumbnailBlob)])
	);
</script>

<div class="website-media">
	{#await metaAndThumbnailPromise}
		<div class="placeholder">Loading...</div>
	{:then metaAndThumbnail}
		{@const meta = metaAndThumbnail[0]}
		{@const thumbnailBlob = metaAndThumbnail[1]}
		{#if thumbnailBlob}
			<img class="image" src={thumbnailBlob.url} alt="Thumbnail of {website.url}" />
			<Separator />
		{/if}

		{#if meta.title}
			<div class="title">{meta.title}</div>
		{/if}
		{#if meta.description}
			<div class="description">{meta.description}</div>
		{/if}
	{:catch e}
		<div class="placeholder error">Failed to load: {e instanceof Error ? e.message : e}</div>
	{/await}

	<Separator />
	<div class="url"><EarthIcon size="1rem" />{new URL(website.url).hostname}</div>

	<MediaOverlayControls>
		{#snippet topRight()}
			<RemoveMediaButton onClickRemove={() => onClickRemove(website)} />
		{/snippet}
	</MediaOverlayControls>
</div>

<style>
	.website-media {
		position: relative;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		overflow: hidden;
		max-height: 25rem;
	}

	.placeholder,
	.title,
	.description,
	.url {
		padding: 0.5rem;
	}

	.image {
		max-width: 100%;
		flex: 1 1 25rem;
		min-height: 0;
		object-fit: cover;
		object-position: center;
	}

	.title {
		font-weight: bold;
	}

	.description {
		font-size: 0.8rem;
		padding-top: 0;
	}

	.url {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8rem;
		color: var(--subtle-fg-color);
	}

	.placeholder {
		color: var(--subtle-fg-color);
	}

	.error {
		color: var(--error-color);
	}
</style>
