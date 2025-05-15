<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte';
	import { adultContentLabelDefinitions, otherLabelDefinitions } from '@/lib/entities/labels';
	import type { Post } from '@/lib/entities/post';

	let { open = $bindable(), post = $bindable() }: { open: boolean; post: Post } = $props();
</script>

<Dialog {open}>
	<div class="content">
		<h2>Add a content warning</h2>

		<div>
			Choose self-labels that are applicable for the media in this post. If none are selected, this
			post is suitable for all audiences.
		</div>

		<fieldset>
			<legend>Adult Content</legend>
			<ul>
				{#each Object.entries(adultContentLabelDefinitions) as [value, { name }]}
					<label>
						<input type="radio" bind:group={post.labels.adultContent} {value} />
						{name}
					</label>
				{/each}
			</ul>
		</fieldset>

		<fieldset>
			<legend>Other</legend>
			<ul>
				{#each Object.entries(otherLabelDefinitions) as [value, { name }]}
					<label>
						<input type="checkbox" bind:group={post.labels.other} {value} />
						{name}
					</label>
				{/each}
			</ul>
		</fieldset>

		<button type="button" class="accent" onclick={() => (open = false)}>Done</button>
	</div>
</Dialog>

<style>
	.content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
