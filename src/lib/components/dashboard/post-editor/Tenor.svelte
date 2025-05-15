<script lang="ts">
	import { SearchIcon, XIcon } from 'lucide-svelte';
	import * as v from 'valibot';
	import Dialog from '$lib/components/Dialog.svelte';
	import { appName, tenorKey } from '$lib/config';
	import { onIdleRunner } from '$lib/on-idle-runner';
	import { generateSizeAndThumbnailBlob } from '@/lib/media-metadata';
	import type { Post } from '@/lib/entities/post';

	let { open = $bindable(), post = $bindable() }: { open: boolean; post: Post } = $props();

	let categories: { name: string; gifUrl: string; searchTerm: string }[] | undefined =
		$state(undefined);
	let trendingSearches: string[] | undefined = $state(undefined);
	let searchSuggestions: string[] | undefined = $state(undefined);

	type Gif = {
		id: string;
		gifUrl: string;
		width: number;
		height: number;
		contentDescription: string;
		searchTerm: string;
		tenorUrl: string;
	};
	let gifs: Gif[] | undefined = $state(undefined);

	let searchInputText = $state('');

	const tenorBaseUrl = 'https://tenor.googleapis.com/v2';

	async function tenorFetch(pathAndSearch: `/${string}`, init?: RequestInit) {
		const url = new URL(`${tenorBaseUrl}${pathAndSearch}`);
		url.searchParams.set('key', tenorKey);
		url.searchParams.set('client_key', appName);
		url.searchParams.set('locale', navigator.language);
		return await fetch(url.toString(), init);
	}

	const categoryObjectSchema = v.object({
		searchterm: v.string(),
		path: v.string(),
		image: v.string(),
		name: v.string()
	});
	const categoriesSchema = v.object({ tags: v.array(categoryObjectSchema) });
	const categoryNameRegex = /#?(.+)/;

	const trendingSearchesSchema = v.object({ results: v.array(v.string()) });

	$effect(() => {
		if (!open) return;

		tenorFetch('/categories')
			.then((response) => response.json())
			.then((json) => v.parse(categoriesSchema, json))
			.then(({ tags }) =>
				tags.map((categoryData) => ({
					name: categoryNameRegex.exec(categoryData.name)?.[1] ?? categoryData.name,
					gifUrl: categoryData.image,
					searchTerm: categoryData.searchterm
				}))
			)
			.then((newCategories) => (categories = newCategories));

		tenorFetch('/trending_terms')
			.then((response) => response.json())
			.then((json) => v.parse(trendingSearchesSchema, json))
			.then(({ results }) => {
				trendingSearches = results;
				searchSuggestions = trendingSearches;
			});
	});

	const mediaObjectSchema = v.object({ url: v.string(), dims: v.tuple([v.number(), v.number()]) });
	const mediaFormatSchema = v.record(
		v.picklist(['gif', 'tinygif', 'mp4', 'tinymp4']),
		mediaObjectSchema
	);
	const responseObjectSchema = v.object({
		id: v.string(),
		media_formats: mediaFormatSchema,
		content_description: v.string(),
		url: v.string()
	});
	const searchSchema = v.object({ next: v.string(), results: v.array(responseObjectSchema) });

	const autocompleteSchema = v.object({ results: v.array(v.string()) });
	const searchSuggestionsSchema = v.object({ results: v.array(v.string()) });

	const queueSearch = onIdleRunner(
		(searchTerm: string, action: 'typing' | 'confirming' | 'suggestion' | 'category') => {
			if (searchTerm.trim().length === 0) {
				gifs = undefined;
				searchSuggestions = trendingSearches;
				return;
			}

			const params = new URLSearchParams();
			params.set('q', searchTerm);
			if (action === 'category') params.set('component', 'categories');
			params.set('media_filter', 'gif,tinygif');

			tenorFetch(`/search?${params.toString()}`)
				.then((response) => response.json())
				.then((json) => v.parse(searchSchema, json))
				.then(({ results }) =>
					results
						.map(({ id, media_formats, content_description, url }) => {
							const mediaObject = media_formats.tinygif ?? media_formats.gif;
							if (!mediaObject) return undefined;

							const [width, height] = mediaObject.dims;
							return {
								id,
								gifUrl: mediaObject.url,
								width,
								height,
								contentDescription: content_description,
								searchTerm,
								tenorUrl: url
							};
						})
						.filter((gif): gif is Gif => !!gif)
				)
				.then((newGifs) => (gifs = newGifs));

			if (action === 'typing' && searchTerm.length >= 2) {
				const params = new URLSearchParams();
				params.set('q', searchTerm);

				tenorFetch(`/autocomplete?${params.toString()}`)
					.then((response) => response.json())
					.then((json) => v.parse(autocompleteSchema, json))
					.then(
						({ results }) =>
							(searchSuggestions = results.filter(
								(suggestion) => suggestion.trim() !== searchTerm.trim()
							))
					);
			} else if (action === 'confirming' || action === 'suggestion' || action === 'category') {
				const params = new URLSearchParams();
				params.set('q', searchTerm);

				tenorFetch(`/search_suggestions?${params.toString()}`)
					.then((response) => response.json())
					.then((json) => v.parse(searchSuggestionsSchema, json))
					.then(
						({ results }) =>
							(searchSuggestions = results.filter(
								(suggestion) => suggestion.trim() !== searchTerm.trim()
							))
					);
			}
		}
	);

	async function setPostMediaToGif(gif: Gif) {
		post.media = null;

		const { thumbnailBlob } = await generateSizeAndThumbnailBlob(gif.gifUrl, 'image/gif');

		post.media = {
			type: 'gif',
			gif: {
				src: gif.gifUrl,
				alt: gif.contentDescription,
				extra: {
					text: 'via Tenor',
					url: gif.tenorUrl
				},
				thumbnailBlob
			}
		};
	}

	async function registerShare(gif: Gif) {
		const params = new URLSearchParams();
		params.set('id', gif.id);
		params.set('q', gif.searchTerm);

		return await tenorFetch(`/registershare?${params.toString()}`).then((response) => response.ok);
	}
</script>

<Dialog {open}>
	<div class="contents">
		<div class="top-bar">
			<div class="bar-left">
				<button type="button" class="ghost" onclick={() => (open = false)}><XIcon /></button>
			</div>
		</div>

		<form
			class="search-bar-container"
			onsubmit={(e) => {
				e.preventDefault();
				queueSearch(0, searchInputText, 'confirming');
			}}
		>
			<div class="search-icon"><SearchIcon /></div>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				class="search-bar"
				type="search"
				placeholder="Search Tenor"
				autofocus
				oninput={(e) => queueSearch(500, e.currentTarget.value, 'typing')}
				bind:value={searchInputText}
			/>
			{#if searchInputText.length > 0}
				<button
					type="button"
					class="ghost clear-search-button"
					onclick={() => {
						queueSearch(0, '', 'suggestion');
						searchInputText = '';
					}}><XIcon /></button
				>
			{/if}
		</form>

		{#if searchSuggestions && searchSuggestions.length > 0}
			{#key searchSuggestions}
				<div class="search-suggestions">
					{#each searchSuggestions as suggestion}
						<button
							type="button"
							class="ghost search-suggestion"
							onclick={() => {
								queueSearch(0, suggestion, 'typing');
								searchInputText = suggestion;
							}}>{suggestion}</button
						>
					{/each}
				</div>
			{/key}
		{/if}

		{#key [categories, gifs]}
			<div class="content-list">
				{#if gifs}
					<div class="gifs">
						{#snippet gifButton(gif: Gif)}
							<button
								type="button"
								class="gif-button"
								onclick={() => {
									setPostMediaToGif(gif);
									open = false;
									registerShare(gif);
								}}
							>
								<img
									src={gif.gifUrl}
									width={gif.width}
									height={gif.height}
									title={gif.contentDescription}
									alt={gif.contentDescription}
									loading="lazy"
								/>
							</button>
						{/snippet}
						<div class="gif-column">
							{#each gifs.filter((_, i) => i % 2 === 0) as gif}
								{@render gifButton(gif)}
							{/each}
						</div>
						<div class="gif-column">
							{#each gifs.filter((_, i) => i % 2 === 1) as gif}
								{@render gifButton(gif)}
							{/each}
						</div>
					</div>{:else if categories}
					<div class="categories">
						{#each categories as category}
							<button
								type="button"
								class="category"
								onclick={() => {
									queueSearch(0, category.searchTerm, 'category');
									searchInputText = category.searchTerm;
								}}
							>
								<img src={category.gifUrl} alt={category.name} loading="lazy" style:font-size="0" />
								<div class="overlay"></div>
								<div class="category-name">{category.name}</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/key}
	</div>
</Dialog>

<style>
	.contents {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		overflow-y: auto;
		height: 100vh;
	}

	.search-bar-container {
		display: flex;
		flex-direction: row;
		align-items: center;

		.search-bar {
			flex: 1;
			padding-inline: 2.5rem;
		}

		.search-icon,
		.clear-search-button {
			display: flex;
			justify-content: center;
			align-items: center;
			width: 2.5rem;
			height: 2.5rem;
		}

		.search-icon {
			margin-right: -2.5rem;
			z-index: 1;
			pointer-events: none;
		}

		.clear-search-button {
			margin-left: -2.5rem;
		}
	}

	.search-suggestions {
		display: flex;
		flex-direction: row;
		gap: 0.5rem;
		flex: 1 0 2.5rem;
		overflow-x: scroll;

		.search-suggestion {
			height: 100%;
			background: none;
			border: 1px solid var(--border-color);
			border-radius: 2.5rem;
			text-wrap: nowrap;
		}
	}

	.content-list {
		overflow-y: scroll;
	}

	.categories {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;

		.category {
			height: 9rem;
			font-weight: bold;
			font-size: 1.5rem;
			color: white;
			text-shadow: 0 0 0.25rem black;
			background: none;
			position: relative;

			img,
			.overlay {
				position: absolute;
				width: 100%;
				height: 100%;
				object-fit: cover;
				object-position: center;
				border-radius: 8px;
			}

			.overlay {
				bottom: 0;
				height: 3rem;
				background: linear-gradient(0deg, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0));
			}

			.category-name {
				position: absolute;
				bottom: 0.5rem;
				left: 0.5rem;
			}
		}
	}

	.gifs {
		display: flex;
		flex-direction: row;
		gap: 0.5rem;

		.gif-column {
			flex: 1;
			display: flex;
			flex-direction: column;
			gap: 0.5rem;

			.gif-button {
				background: none;
				padding: 0;
				height: fit-content;

				img {
					width: 100%;
					object-fit: cover;
					object-position: center;
					border-radius: 8px;
				}
			}
		}
	}
</style>
