<script lang="ts">
	import { PackageOpenIcon } from 'lucide-svelte';

	const { data, form } = $props();

	let username = $state('');

	const usernameSuffix = $derived(username.includes('.') ? '' : '.bsky.social');

	const error = $derived(data.error || form?.error);
</script>

<div class="container">
	<form method="POST">
		<div class="logo"><PackageOpenIcon />Scheduler</div>

		<div>Log in with your Bluesky account.</div>

		<label>
			Bluesky Username
			<div class="username-container">
				<!-- svelte-ignore a11y_autofocus -->
				<input type="text" bind:value={username} required autofocus />
				{#if usernameSuffix}<div>{usernameSuffix}</div>{/if}
			</div>
		</label>

		<input name="username" type="hidden" value={`${username}${usernameSuffix}`} />

		<button type="submit" class="accent">Continue</button>

		{#if error}
			<div class="error">{error}</div>
		{/if}
	</form>
</div>

<style>
	.container {
		width: 100vw;
		height: 100vh;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.logo {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.5rem;
		font-weight: bold;
	}

	form {
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 1rem;
		flex: 1;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.error {
		color: var(--error-color);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.username-container {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 4px;

		input[type='text'] {
			flex: 1;
		}
	}
</style>
