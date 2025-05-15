<script lang="ts">
	import type { Post } from '@/lib/entities/post';
	import Avatar from '../Avatar.svelte';
	import type { Author } from '@/lib/author';

	const { post, author }: { post: Post; author: Author } = $props();
</script>

<div class="post">
	<div class="author">
		<Avatar avatarSrc={author.avatarSrc} handle={author.handle} />
	</div>

	<div class="content">
		<div class="post-text">{post.text}</div>

		{#if post.media}
			{#if post.media.type === 'images'}
				<div class="media images">
					{#each post.media.images as image}
						{#await image.imageBlob.url then src}
							<img {src} alt={image.alt} />
						{/await}
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.post {
		display: flex;
		flex-direction: row;
		gap: 0.75rem;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.post-text {
		font-size: 1.25rem;
	}

	.media {
		border-radius: 8px;
		overflow: hidden;
	}

	.images {
		display: grid;
		gap: 0.25rem;
	}

	.images img {
		place-self: stretch;
		object-fit: cover;
		object-position: center;
		max-width: 100%;
		max-height: 100%;
	}

	.images:has(> :last-child:nth-child(1)) {
		grid-template-columns: 1fr;
	}

	.images:has(> :last-child:nth-child(2)) {
		grid-template-columns: repeat(2, 1fr);
	}

	.images:has(> :last-child:nth-child(3)),
	.images:has(> :last-child:nth-child(4)) {
		grid-template-columns: repeat(2, 1fr);
		grid-template-rows: repeat(2, 1fr);
	}

	.images:has(> :last-child:nth-child(3)) {
		> :first-child {
			grid-row: span 2;
		}
	}
</style>
