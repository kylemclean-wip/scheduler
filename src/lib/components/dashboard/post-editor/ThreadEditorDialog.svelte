<script module lang="ts">
	export function postIsEmpty({ text, media }: Post) {
		return text.trim().length === 0 && !media;
	}

	export function canBePosted(post: Post) {
		return !postIsEmpty(post);
	}
</script>

<script lang="ts">
	import {
		ArrowLeft as ArrowLeftIcon,
		CalendarDaysIcon,
		EarthIcon,
		Languages as LanguagesIcon,
		NotepadTextDashedIcon,
		SendIcon,
		UsersIcon,
		X as XIcon
	} from 'lucide-svelte';
	import { Agent, RichText } from '@atproto/api';
	import * as v from 'valibot';
	import { invalidateAll } from '$app/navigation';
	import { getLanguageName, postLanguages, type PostLanguage } from '@/lib/entities/post-languages';
	import PostEditor from './PostEditor.svelte';
	import LanguageSelector from './LanguageSelector.svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import { showConfirmDialog } from '$lib/components/AlertDialog.svelte';
	import Separator from '../../Separator.svelte';
	import DateTimeInput from './DateTimeInput.svelte';
	import { uploadBlobsAndStoreThread } from '@/lib/bsky-store';
	import type { Author } from '@/lib/author';
	import type { EditableThread } from '@/lib/entities/thread';
	import { postFacetsSchema, type Post } from '@/lib/entities/post';
	import { getClient } from '@/lib/scheduler-api';

	let {
		open = $bindable(),
		author,
		initialThread,
		agent
	}: {
		open: boolean;
		author: Author;
		initialThread?: EditableThread | undefined;
		agent: Agent;
	} = $props();

	let scheduledDateValid = $state(false);

	// At least 5 minutes from now, rounded to 5 minutes
	const minDate = new Date(
		Math.ceil((Date.now() + 5 * 60 * 1000) / (5 * 60 * 1000)) * 5 * 60 * 1000
	);

	// At most 366 days from the minimum date, rounded to 5 minutes
	const maxDate = new Date(
		Math.floor((minDate.getTime() + 366 * 24 * 60 * 60 * 1000) / (5 * 60 * 1000)) * 5 * 60 * 1000
	);

	// 1 day from now, rounded to 5 minutes
	const defaultDate = new Date(
		Math.ceil((Date.now() + 24 * 60 * 60 * 1000) / (5 * 60 * 1000)) * 5 * 60 * 1000
	);

	let thread: EditableThread = $state(
		initialThread ?? {
			posts: [
				{
					text: '',
					facets: [],
					media: null,
					labels: { adultContent: '', other: [] },
					editorState: { textFocusPosition: 0 }
				}
			],
			interactionSettings: { quotes: true, replies: 'all' },
			languages: [
				(navigator.languages.find((lang) =>
					postLanguages.includes(lang as PostLanguage)
				) as PostLanguage) ?? 'en'
			],
			editorState: {
				postVisibility: {
					type: 'scheduled',
					scheduledDate: {
						year: defaultDate.getFullYear(),
						month: defaultDate.getMonth() + 1,
						day: defaultDate.getDate(),
						hour: defaultDate.getHours(),
						minute: defaultDate.getMinutes()
					}
				}
			}
		}
	);

	const threadCanBeSubmitted = $derived.by(() => {
		if (thread.editorState.postVisibility.type === 'scheduled' && !scheduledDateValid) return false;
		if (submitStatus?.type === 'submitting') return false;
		return thread.posts.every((post) => canBePosted(post));
	});

	let activePostIndex = $state(0);

	const selectedLanguageNames = $derived(
		thread.languages.length > 0
			? thread.languages.map((lang) => getLanguageName(lang)).join(', ')
			: 'Languages'
	);

	let submitStatus:
		| { type: 'submitting'; promise: Promise<unknown>; message: string }
		| { type: 'error'; error: unknown }
		| undefined = $state(undefined);

	function tryClose() {
		if (thread.posts.every(postIsEmpty)) {
			open = false;
			return;
		}

		showConfirmDialog({
			text: [`Discard ${thread.posts.length > 1 ? 'the posts in this thread' : 'this post'}?`],
			confirm: {
				text: 'Discard',
				class: 'danger',
				onClick: () => {
					open = false;
				}
			}
		});
	}

	async function trySubmitThread() {
		if (!threadCanBeSubmitted) return;

		const postAsDid = agent.did;
		if (!postAsDid) throw new Error('No agent did');

		// `as` required due to https://github.com/sveltejs/svelte/issues/13837
		const threadSnapshot = $state.snapshot(thread) as EditableThread;
		const publicAgent = new Agent('https://public.api.bsky.app');
		const resolveMentionsPromise = Promise.all(
			threadSnapshot.posts.map(async (post) => {
				const rt = new RichText({ text: post.text });
				await rt.detectFacets(publicAgent);
				post.facets = v.parse(postFacetsSchema, rt.facets ?? []);
			})
		);

		try {
			submitStatus = {
				type: 'submitting',
				promise: resolveMentionsPromise,
				message: 'Resolving mentions...'
			};
			await resolveMentionsPromise;

			const submittingPromise = uploadBlobsAndStoreThread(threadSnapshot, agent).then(
				({ storedThreadUri, storedThreadKey, blobIds, prefetchBlobCids }) =>
					client.api.threads.$post({
						json: {
							storedThreadUri,
							storedThreadKey,
							blobIds,
							prefetchBlobCids,
							postAsDid,
							scheduledFor:
								thread.editorState.postVisibility.type === 'scheduled'
									? new Date(
											thread.editorState.postVisibility.scheduledDate.year,
											thread.editorState.postVisibility.scheduledDate.month - 1,
											thread.editorState.postVisibility.scheduledDate.day,
											thread.editorState.postVisibility.scheduledDate.hour,
											thread.editorState.postVisibility.scheduledDate.minute
										).toISOString()
									: null
						}
					})
			);

			submitStatus = {
				type: 'submitting',
				promise: submittingPromise,
				message: 'Posting...'
			};
			await submittingPromise;

			submitStatus = undefined;
			open = false;

			invalidateAll();
		} catch (e) {
			submitStatus = { type: 'error', error: e };
			console.error(e);
		}
	}

	const client = getClient(fetch);
</script>

<svelte:window
	onbeforeunload={(event) => {
		if (!thread.posts.every(postIsEmpty)) {
			event.preventDefault();
			event.returnValue = true;
			return true;
		}
	}}
/>

<Dialog
	{open}
	onClickBackdrop={tryClose}
	onEscape={tryClose}
	pages={['edit', 'interaction', 'language'] as const}
	top
	gap="0"
	padding="0"
>
	{#snippet renderPage(page, setPage)}
		{#if page === 'edit'}
			<div class="edit-page" inert={submitStatus?.type === 'submitting'}>
				<div class="top-bar horizontal-bar">
					<div class="bar-left">
						<button title="Close" type="button" class="ghost" onclick={tryClose}><XIcon /></button>
					</div>

					<div class="bar-right">
						{#if submitStatus}
							<div class={{ error: submitStatus.type === 'error' }}>
								{submitStatus.type === 'submitting'
									? submitStatus.message
									: String(submitStatus.error ?? 'Failed to submit')}
							</div>
						{/if}

						<button
							type="button"
							class="accent"
							disabled={!threadCanBeSubmitted}
							onclick={trySubmitThread}
						>
							{#if thread.editorState.postVisibility.type === 'scheduled'}
								Schedule
							{:else if thread.editorState.postVisibility.type === 'draft'}
								Save
							{:else}
								Post
							{/if}
						</button>
					</div>
				</div>

				<section>
					<div class="posts">
						{#each thread.posts as post, i (post)}
							<PostEditor
								bind:post={thread.posts[i]}
								{author}
								active={i === activePostIndex}
								postIndex={i}
								postCount={thread.posts.length}
								becomeActive={() => (activePostIndex = i)}
								addNewPostAfter={() => {
									if (i + 1 >= thread.posts.length || !postIsEmpty(thread.posts[i + 1]))
										thread.posts.splice(i + 1, 0, {
											text: '',
											facets: [],
											media: null,
											labels: { adultContent: '', other: [] },
											editorState: {
												textFocusPosition: 0
											}
										});

									activePostIndex = i + 1;
								}}
								deletePost={() => {
									thread.posts.splice(i, 1);
									activePostIndex = Math.max(0, Math.min(thread.posts.length - 1, i));
								}}
							/>
						{/each}
					</div>
				</section>

				<Separator />

				<section class="bottom-section">
					<div class="thread-settings-row">
						<div class="visibility">
							<div class="visibility-icon">
								{#if thread.editorState.postVisibility.type === 'scheduled'}
									<CalendarDaysIcon />
								{:else if thread.editorState.postVisibility.type === 'draft'}
									<NotepadTextDashedIcon />
								{:else if thread.editorState.postVisibility.type === 'post-now'}
									<SendIcon />
								{/if}
							</div>
							<div class="select-container ghost accent">
								<select title="Visibility" bind:value={thread.editorState.postVisibility.type}>
									<option value="scheduled">Scheduled</option>
									<option value="draft">Save as draft</option>
									<option value="post-now">Post now</option>
								</select>
							</div>
						</div>

						<button
							title="Interaction Settings"
							type="button"
							class="ghost accent"
							onclick={() => setPage('interaction')}
						>
							{#if thread.interactionSettings.quotes && thread.interactionSettings.replies === 'all'}
								<EarthIcon />Anybody can interact
							{:else}
								<UsersIcon />Interaction limited
							{/if}
						</button>

						<button
							title="Languages"
							type="button"
							class="ghost accent"
							onclick={() => setPage('language')}><LanguagesIcon />{selectedLanguageNames}</button
						>
					</div>

					{#if thread.editorState.postVisibility.type === 'scheduled'}
						<fieldset class="schedule-settings">
							<legend>Scheduled for</legend>
							<DateTimeInput
								bind:date={thread.editorState.postVisibility.scheduledDate}
								minDate={{
									year: minDate.getFullYear(),
									month: minDate.getMonth() + 1,
									day: minDate.getDate(),
									hour: minDate.getHours(),
									minute: minDate.getMinutes()
								}}
								maxDate={{
									year: maxDate.getFullYear(),
									month: maxDate.getMonth() + 1,
									day: maxDate.getDate(),
									hour: maxDate.getHours(),
									minute: maxDate.getMinutes()
								}}
								onValidityChanged={(valid) => (scheduledDateValid = valid)}
							/>
						</fieldset>
					{/if}
				</section>
			</div>
		{/if}

		{#if page === 'interaction'}
			<div class="top-bar horizontal-bar">
				<div class="bar-left">
					<button type="button" class="ghost" onclick={() => setPage('edit')}>
						<ArrowLeftIcon />
					</button>
				</div>
			</div>

			<section>
				<div class="interaction-settings">
					<h2>Interaction settings</h2>

					<div>
						Choose who can interact with {#if thread.posts.length > 1}the posts in this thread{:else}this
							post{/if}.
					</div>

					<fieldset>
						<legend>Quote settings</legend>
						<ul>
							<label>
								<input type="checkbox" bind:checked={thread.interactionSettings.quotes} />
								Allow quote posts
							</label>
						</ul>
					</fieldset>

					<fieldset>
						<legend>Reply settings</legend>
						<div>Allow replies from:</div>
						<ul>
							<label>
								<input type="radio" bind:group={thread.interactionSettings.replies} value="all" />
								Everybody
							</label>

							<label>
								<input
									type="radio"
									bind:group={thread.interactionSettings.replies}
									value="mentioned-and-followed"
								/>
								Mentioned and followed users
							</label>

							<label>
								<input
									type="radio"
									bind:group={thread.interactionSettings.replies}
									value="mentioned"
								/>
								Mentioned users
							</label>

							<label>
								<input
									type="radio"
									bind:group={thread.interactionSettings.replies}
									value="followed"
								/>
								Followed users
							</label>

							<label>
								<input type="radio" bind:group={thread.interactionSettings.replies} value="none" />
								Nobody
							</label>
						</ul>
					</fieldset>
				</div>
			</section>
		{/if}

		{#if page === 'language'}
			<div class="top-bar horizontal-bar">
				<div class="bar-left">
					<button type="button" class="ghost" onclick={() => setPage('edit')}>
						<ArrowLeftIcon />
					</button>
				</div>
			</div>

			<section>
				<LanguageSelector
					bind:selectedLanguages={thread.languages}
					postCount={thread.posts.length}
				/>
			</section>
		{/if}
	{/snippet}
</Dialog>

<svelte:document
	onkeydown={(e) => {
		if (e.ctrlKey && e.key === 'Enter') {
			trySubmitThread();
			e.preventDefault();
			e.stopImmediatePropagation();
		}
	}}
/>

<style>
	.edit-page {
		display: contents;
	}

	.posts {
		display: flex;
		flex-direction: column;
	}

	.horizontal-bar {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;

		.bar-left,
		.bar-right {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: 0.5rem;
		}

		.bar-left {
			justify-content: start;
		}

		.bar-right {
			justify-content: end;
		}
	}

	section {
		margin: 1rem;
	}

	dialog[data-page='edit'] section {
		margin: 0.5rem;
	}

	.top-bar {
		position: sticky;
		top: 0rem;
		background-color: var(--main-bg-color);
		z-index: 1;
		padding: 0.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.thread-settings-row {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		gap: 0.5rem;
	}

	.visibility {
		display: flex;
		flex-direction: row;
		align-items: stretch;

		.visibility-icon {
			color: var(--accent-color);
			position: absolute;
			padding-left: var(--button-padding);
			pointer-events: none;
			align-self: center;
		}

		select {
			padding-left: calc(var(--button-gap) + 2rem);
		}
	}

	.interaction-settings {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.bottom-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.error {
		color: var(--error-color);
	}
</style>
