<script lang="ts">
	let { onClickRemove }: { onClickRemove: () => void } = $props();
</script>

<button type="button" class="remove-button" onclick={onClickRemove} aria-label="Remove">✕</button>

<style>
	.remove-button {
		aspect-ratio: 1/1;
	}
</style>
