<script lang="ts">
	import { dev } from '$app/environment';
	import { Agent, AtUri } from '@atproto/api';
	import { clientLoginUrl } from '@/lib/client-login';
	import { requireNonNull } from '@/lib/require-non-null';
	import Separator from '@/lib/components/Separator.svelte';
	import { getClient } from '@/lib/scheduler-api';
	import { invalidateAll } from '$app/navigation';

	const { data } = $props();
	requireNonNull(data.loggedInUser);

	const agent = $derived(
		data.loggedInUser.clientData.session ? new Agent(data.loggedInUser.clientData.session) : null
	);

	const client = getClient(fetch);
</script>

<h1 class="padded-container">Settings</h1>
<Separator />

<div class="settings padded-container">
	{#if dev}
		{#if agent}
			<button
				onclick={async () => {
					while (true) {
						const recordsResponse = await agent.com.atproto.repo.listRecords({
							collection: 'io.github.kylemclean.scheduler.experimental.storedThread',
							repo: data.loggedInUser.id,
							limit: 100
						});

						const records = recordsResponse.data.records;
						if (records.length === 0) break;

						const deleteRecordPromises = records.map((record) => {
							const atUri = new AtUri(record.uri);
							return agent.com.atproto.repo.deleteRecord({
								collection: atUri.collection,
								repo: atUri.host,
								rkey: atUri.rkey
							});
						});

						await Promise.all(deleteRecordPromises);
					}

					await client.api.threads.all.$delete();

					invalidateAll();

					alert('Deleted all threads');
				}}>Delete all threads</button
			>
		{:else}
			<div>Not logged in to Bluesky on client</div>
			<a href={clientLoginUrl()} class="button">Log in</a>
		{/if}
	{/if}
</div>

<style>
	.settings {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: start;
	}
</style>
