<script lang="ts">
	import { getRemainingGraphemes } from '$lib/grapheme-counter';

	const { text, maxGraphemes }: { text: string; maxGraphemes: number } = $props();

	const remainingGraphemes = $derived(getRemainingGraphemes(text, maxGraphemes));
</script>

<div
	title="Characters left"
	class={['characters-left', { 'out-of-characters': remainingGraphemes < 0 }]}
>
	{remainingGraphemes}
</div>

<style>
	.characters-left {
		font-variant: no-contextual tabular-nums;
	}

	.out-of-characters {
		color: #ff0000;
	}
</style>
