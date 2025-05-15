<script lang="ts">
	import { getLanguageName, postLanguages, type PostLanguage } from '@/lib/entities/post-languages';

	let {
		selectedLanguages = $bindable(),
		postCount
	}: { selectedLanguages: PostLanguage[]; postCount: number } = $props();

	const selectedOrPreferredLanguages = [
		...selectedLanguages,
		...navigator.languages
			.filter(
				(lang): lang is PostLanguage =>
					postLanguages.includes(lang as PostLanguage) &&
					!selectedLanguages.includes(lang as PostLanguage)
			)
			.sort((a, b) => getLanguageName(a).localeCompare(getLanguageName(b)))
	];

	const languagesAtTop = [
		...selectedOrPreferredLanguages,
		...(['en', 'ja', 'pt', 'es', 'de', 'fr', 'ko', 'nl'] as const)
			.filter((lang) => !selectedOrPreferredLanguages.includes(lang))
			.slice(0, Math.max(0, 10 - selectedOrPreferredLanguages.length))
	];

	const otherLanguages = postLanguages
		.filter((language) => !languagesAtTop.includes(language))
		.sort((a, b) => getLanguageName(a).localeCompare(getLanguageName(b)));
</script>

<div class="contents">
	<div>
		Select the languages that are used in {#if postCount > 1}these posts{:else}this post{/if}.
	</div>

	<div class="selected-info">
		<div>
			<b>Selected:</b>
			{selectedLanguages.length > 0
				? selectedLanguages.map((lang) => getLanguageName(lang)).join(', ')
				: 'none'}
		</div>

		<button type="button" onclick={() => (selectedLanguages = [])}>Deselect All</button>
	</div>

	{#snippet languageOption(language: PostLanguage)}
		<li>
			<label>
				<input type="checkbox" bind:group={selectedLanguages} value={language} />
				{getLanguageName(language)}
			</label>
		</li>
	{/snippet}

	<div class="language-options">
		<ul>
			{#each languagesAtTop as language}
				{@render languageOption(language)}
			{/each}
		</ul>

		{#if languagesAtTop.length > 0 && otherLanguages.length > 0}
			<div class="spacer"></div>
		{/if}

		<ul>
			{#each otherLanguages as language}
				{@render languageOption(language)}
			{/each}
		</ul>
	</div>
</div>

<style>
	.contents {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 400px;
		overflow: auto;
	}

	.selected-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: start;
	}

	.language-options {
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 8px;

		ul {
			display: contents;
			list-style-type: none;
		}
	}
</style>
