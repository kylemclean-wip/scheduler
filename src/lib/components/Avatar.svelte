<script lang="ts">
	const { avatarSrc, handle }: { avatarSrc?: string; handle: string } = $props();
</script>

<img
	class="avatar"
	src={avatarSrc ||
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='}
	alt={handle}
	title={handle}
/>

<style>
	.avatar {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		object-fit: cover;
	}
</style>
