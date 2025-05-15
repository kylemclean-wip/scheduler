<script lang="ts">
	import {
		CalendarDaysIcon,
		EllipsisIcon,
		EllipsisVerticalIcon,
		NotepadTextDashedIcon,
		PencilIcon,
		TrashIcon
	} from 'lucide-svelte';
	import { DropdownMenu } from 'bits-ui';
	import PostView from './PostView.svelte';
	import type { PendingThread } from '@/lib/entities/thread';

	interface Props {
		pendingThread: PendingThread;
		editThread?: () => void;
		deleteThread?: () => void;
	}

	const { pendingThread, editThread, deleteThread }: Props = $props();
</script>

<div class="thread">
	<section>
		<div class="top-bar">
			<div class="bar-left">
				{#if pendingThread.scheduledFor === null}
					<NotepadTextDashedIcon />Draft
				{:else}
					<CalendarDaysIcon />Scheduled for {pendingThread.scheduledFor.toLocaleString()}
				{/if}
			</div>

			<div class="bar-right">
				{#if editThread || deleteThread}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger asChild let:builder>
							<button use:builder.action type="button" class="ghost options-button" title="Options">
								<EllipsisVerticalIcon />
							</button>
						</DropdownMenu.Trigger>

						<DropdownMenu.Content side="bottom" align="end">
							{#if editThread}
								<DropdownMenu.Item onclick={() => editThread()}>
									<PencilIcon />Edit
								</DropdownMenu.Item>
							{/if}
							{#if deleteThread}
								<DropdownMenu.Item class="danger" onclick={() => deleteThread()}>
									<TrashIcon />Delete
								</DropdownMenu.Item>
							{/if}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{/if}
			</div>
		</div>

		<div class="first-post">
			<PostView post={pendingThread.thread.posts[0]} author={pendingThread.author} />
		</div>
	</section>

	{#if pendingThread.thread.posts.length > 1}
		<button type="button" class="ghost more-posts-button">
			<EllipsisIcon />
			{pendingThread.thread.posts.length - 1} more post{pendingThread.thread.posts.length > 2
				? 's'
				: ''}
		</button>
	{/if}
</div>

<style>
	.thread {
		display: flex;
		flex-direction: column;
	}

	section {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.top-bar {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		color: var(--subtle-fg-color);

		.bar-left,
		.bar-right {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: 0.5rem;
		}
	}

	.options-button {
		height: 1.5rem;
		color: inherit;
	}

	.more-posts-button {
		justify-content: start;
		border-bottom-left-radius: 0px;
		border-bottom-right-radius: 0px;
	}
</style>
