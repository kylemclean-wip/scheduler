<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte';
	import { getRemainingGraphemes } from '$lib/grapheme-counter';
	import CharacterCounter from './CharacterCounter.svelte';

	let {
		open = $bindable(),
		media = $bindable(),
		maxGraphemes
	}: { open: boolean; media: { alt: string }; maxGraphemes: number } = $props();
</script>

<Dialog {open}>
	<div>Enter alt text for this media.</div>

	<textarea bind:value={media.alt} rows="8"></textarea>

	<div class="bottom-bar">
		<CharacterCounter text={media.alt} {maxGraphemes} />
		<button
			type="button"
			class="accent"
			disabled={getRemainingGraphemes(media.alt, maxGraphemes) < 0}
			onclick={() => (open = false)}>Done</button
		>
	</div>
</Dialog>

<style>
	.bottom-bar {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: end;
		gap: 0.5rem;
	}
</style>
