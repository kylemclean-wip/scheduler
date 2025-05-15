<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { AtUri, type Agent } from '@atproto/api';
	import ThreadView from './ThreadView.svelte';
	import Separator from '../Separator.svelte';
	import { getClient } from '@/lib/scheduler-api';
	import type { PendingThread } from '@/lib/entities/thread';
	import { showConfirmDialog } from '../AlertDialog.svelte';
	import { clientLoginUrl } from '@/lib/client-login';

	const {
		items,
		agent,
		children
	}: {
		items: ({ pendingThread: PendingThread } | { error: string })[];
		agent: Agent | null;
		children: Snippet;
	} = $props();

	const client = getClient(fetch);

	function deleteThread(pendingThread: PendingThread) {
		showConfirmDialog({
			text: [`Delete this ${pendingThread.thread.posts.length > 1 ? 'thread' : 'post'}?`],
			confirm: {
				text: 'Delete',
				class: 'danger',
				onClick: () => {
					if (!agent) {
						goto(clientLoginUrl());
						return;
					}

					client.api.threads[':storedThreadUri']
						.$delete({
							param: { storedThreadUri: encodeURIComponent(pendingThread.storedThreadUri) }
						})
						.then(() => {
							const storedThreadAtUri = new AtUri(pendingThread.storedThreadUri);
							return agent.com.atproto.repo.deleteRecord({
								collection: storedThreadAtUri.collection,
								repo: storedThreadAtUri.host,
								rkey: storedThreadAtUri.rkey
							});
						})
						.then(() => {
							invalidateAll();
						});
				}
			}
		});
	}
</script>

<div class="threads">
	{#if items.length > 0}
		{#each items as item}
			{#if 'error' in item}
				<div class="error">{item.error}</div>
			{:else}
				<ThreadView
					pendingThread={item.pendingThread}
					deleteThread={() => deleteThread(item.pendingThread)}
				/>
				<Separator />
			{/if}
		{/each}
	{:else}
		{@render children()}
	{/if}
</div>

<style>
	.threads {
		display: flex;
		flex-direction: column;
	}

	.error {
		color: var(--error-color);
	}
</style>
