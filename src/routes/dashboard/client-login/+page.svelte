<script lang="ts">
	import { page } from '$app/state';
	import { logIn } from '$lib/client-bsky-oauth';
	import { requireNonNull } from '$lib/require-non-null';
	import Separator from '@/lib/components/Separator.svelte';
	import { OAuthResponseError } from '@atproto/oauth-client-browser';

	const { data } = $props();
	requireNonNull(data.loggedInUser);

	const profile = $derived(data.loggedInUser.clientData.profile);

	let visible = $state(false);
	let logInPromise: Promise<void> | undefined = $state(undefined);
	let logInError: Error | undefined = $state(undefined);

	$effect(() => {
		visible = true;
	});
</script>

{#if visible}
	<h1 class="padded-container">Log in required</h1>
	<Separator />

	<div class="contents padded-container">
		<p>To perform this action, please log in to your Bluesky account.</p>

		<button
			disabled={!!logInPromise}
			onclick={() => {
				logInPromise = logIn(profile.handle, page.url.searchParams.get('next') ?? undefined)
					.catch((e) => {
						console.error(e);

						if (
							e instanceof OAuthResponseError &&
							typeof e.payload === 'object' &&
							e.payload &&
							'error' in e.payload &&
							e.payload.error === 'invalid_dpop_proof' &&
							'error_description' in e.payload &&
							typeof e.payload.error_description === 'string' &&
							e.payload.error_description.includes('timestamp')
						) {
							logInError = new Error('Cannot log in because your system time is incorrect.', {
								cause: e
							});
						} else {
							logInError = e;
						}
					})
					.finally(() => {
						logInPromise = undefined;
					});
			}}>Log in to Bluesky</button
		>

		{#if logInError && !logInPromise}
			<div class="error">
				{logInError.message}
			</div>
		{/if}
	</div>
{/if}

<style>
	.contents {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: flex-start;
	}

	.error {
		color: var(--error-color);
	}
</style>
