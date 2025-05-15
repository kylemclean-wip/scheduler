<script lang="ts">
	import { RichText } from '@atproto/api';
	import { Editor, Mark, mergeAttributes } from '@tiptap/core';
	import Document from '@tiptap/extension-document';
	import Paragraph from '@tiptap/extension-paragraph';
	import Placeholder from '@tiptap/extension-placeholder';
	import Text from '@tiptap/extension-text';
	import { untrack } from 'svelte';
	import {
		ImageIcon,
		FilmIcon,
		PlusIcon,
		CircleXIcon,
		ShieldIcon,
		ImagePlayIcon
	} from 'lucide-svelte';
	import * as v from 'valibot';
	import ImageMedia from '$lib/components/dashboard/post-editor/ImageMedia.svelte';
	import VideoMedia from '$lib/components/dashboard/post-editor/VideoMedia.svelte';
	import { postIsEmpty } from './ThreadEditorDialog.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import LabelSelector from './LabelSelector.svelte';
	import { adultContentLabelDefinitions, otherLabelDefinitions } from '@/lib/entities/labels';
	import { showAlertDialog, showConfirmDialog } from '$lib/components/AlertDialog.svelte';
	import CharacterCounter from './CharacterCounter.svelte';
	import Tenor from './Tenor.svelte';
	import GifMedia from './GifMedia.svelte';
	import { getLinkMeta } from '$lib/get-link-meta';
	import WebsiteMedia from './WebsiteMedia.svelte';
	import type { Author } from '@/lib/author';
	import { computeVideoSize } from '@/lib/media-metadata';
	import type { EditableImagesMediaData } from '@/lib/entities/media/images';
	import { postFacetsSchema, type EditablePost } from '@/lib/entities/post';
	import { ThreadBlob } from '@/lib/entities/media/thread-blob';

	interface Props {
		post: EditablePost;
		author: Author;
		active: boolean;
		postIndex: number;
		postCount: number;
		becomeActive: () => void;
		addNewPostAfter: () => void;
		deletePost: () => void;
	}

	let {
		post = $bindable(),
		author,
		active,
		postIndex,
		postCount,
		becomeActive,
		addNewPostAfter,
		deletePost
	}: Props = $props();

	let editorElement: HTMLDivElement | undefined = $state(undefined);
	let imagesInput: HTMLInputElement | undefined = $state(undefined);
	let videoInput: HTMLInputElement | undefined = $state(undefined);
	let imageCanvas: HTMLCanvasElement;

	let labelSelectorOpen = $state(false);
	let gifDialogOpen = $state(false);

	const empty = $derived(postIsEmpty(post));

	const imageLimit = 4;

	async function onImageInputChange() {
		if (!imagesInput?.files || imagesInput.files.length === 0) return;

		const existingImageCount = post.media?.type === 'images' ? post.media.images.length : 0;
		if (imagesInput.files.length + existingImageCount > imageLimit) {
			showAlertDialog({
				text: ['Your post can have a maximum of only 4 images.']
			});
		}

		const imageFiles = [...imagesInput.files].slice(0, imageLimit - existingImageCount);

		const originalImagePromises = imageFiles.map((imageFile) => {
			const originalImage = new Image();
			originalImage.src = URL.createObjectURL(imageFile);

			const { promise, reject, resolve } = Promise.withResolvers<{
				image: HTMLImageElement;
				name: string;
				type: string;
				lossy: boolean;
			}>();
			originalImage.onload = () => {
				URL.revokeObjectURL(originalImage.src);
				resolve({
					image: originalImage,
					name: imageFile.name,
					type: imageFile.type,
					lossy: imageFile.type !== 'image/png'
				});
			};
			originalImage.onerror = () => {
				URL.revokeObjectURL(originalImage.src);
				reject(new Error(`Failed to load ${imageFile.name}.`));
			};

			return promise;
		});

		const originalImageResults = await Promise.allSettled(originalImagePromises);
		const failedOriginalImages = originalImageResults.filter(
			(result) => result.status === 'rejected'
		);
		if (failedOriginalImages.length > 0) {
			showAlertDialog({
				text: failedOriginalImages.map((result) =>
					result.reason instanceof Error ? result.reason.message : String(result.reason)
				)
			});
		}
		const originalImages = originalImageResults
			.filter((result) => result.status === 'fulfilled')
			.map((result) => result.value);

		const ctx = imageCanvas.getContext('2d');
		if (!ctx) throw new Error('Failed to get canvas context');

		const convertedImagePromises = originalImages.map((originalImage) => {
			imageCanvas.width = originalImage.image.width;
			imageCanvas.height = originalImage.image.height;
			ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);

			ctx.drawImage(originalImage.image, 0, 0, imageCanvas.width, imageCanvas.height);

			const { promise, reject, resolve } = Promise.withResolvers<EditableImagesMediaData[number]>();
			imageCanvas.toBlob(
				(blob) => {
					if (blob) {
						resolve({
							imageBlob: new ThreadBlob(crypto.randomUUID(), blob),
							alt: '',
							size: { width: imageCanvas.width, height: imageCanvas.height }
						});
					} else {
						reject(new Error(`Failed to convert ${originalImage.name}.`));
					}
				},
				originalImage.lossy ? 'image/jpeg' : 'image/png',
				originalImage.lossy ? 0.8 : 1
			);

			return promise;
		});

		const convertedImageResults = await Promise.allSettled(convertedImagePromises);
		const failedConvertedImages = convertedImageResults.filter(
			(result) => result.status === 'rejected'
		);
		if (failedConvertedImages.length > 0) {
			showAlertDialog({
				text: failedConvertedImages.map((result) =>
					result.reason instanceof Error ? result.reason.message : String(result.reason)
				)
			});
		}
		const convertedImages = convertedImageResults
			.filter((result) => result.status === 'fulfilled')
			.map((result) => result.value);

		if (convertedImages.length === 0) return;

		if (!post.media || post.media.type !== 'images') {
			post.media = { type: 'images', images: convertedImages };
		} else {
			post.media.images = [...post.media.images, ...convertedImages];
		}
	}

	function removeImage(index: number) {
		if (!post.media || post.media.type !== 'images') return;

		post.media.images.splice(index, 1);
		if (post.media.images.length === 0) post.media = null;
	}

	// https://github.com/bluesky-social/social-app/blob/d7f5ee8415bd6d37a889d395f30b912cb1068e09/src/lib/constants.ts#L144
	const supportedVideoTypes = [
		'video/mp4',
		'video/mpeg',
		'video/webm',
		'video/quicktime',
		'image/gif'
	] as const;

	async function onVideoInputChange() {
		if (!videoInput?.files || videoInput.files.length === 0) return;

		const file = videoInput.files[0];
		const src = URL.createObjectURL(file);

		post.media = null;

		const size = await computeVideoSize(src, file.type);

		post.media = {
			type: 'video',
			video: {
				videoBlob: new ThreadBlob(crypto.randomUUID(), file),
				alt: '',
				size,
				captionsBlob: null
			}
		};
	}

	function setCaptions(file: File | undefined) {
		if (!post.media || post.media.type !== 'video') return;

		post.media.video.captionsBlob = file ? new ThreadBlob(crypto.randomUUID(), file) : null;
	}

	let doNotCreateMediaForLinkText: string | undefined = undefined;
	let didPasteThisUpdate = false;

	$effect(() => {
		const Link = Mark.create({
			name: 'link',

			addOptions() {
				return {
					HTMLAttributes: {
						class: 'link-facet',
						spellcheck: 'false'
					}
				};
			},

			renderHTML({ HTMLAttributes }) {
				return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
			}
		});

		const Mention = Mark.create({
			name: 'mention',

			addOptions() {
				return {
					HTMLAttributes: {
						class: 'mention-facet',
						spellcheck: 'false'
					}
				};
			},

			renderHTML({ HTMLAttributes }) {
				return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
			}
		});

		const Tag = Mark.create({
			name: 'tag',

			addOptions() {
				return {
					HTMLAttributes: {
						class: 'tag-facet',
						spellcheck: 'false'
					}
				};
			},

			renderHTML({ HTMLAttributes }) {
				return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
			}
		});

		function onEditorCreateOrUpdate() {
			const editorText = editor.getText();
			const richText = new RichText({ text: editorText });
			richText.detectFacetsWithoutResolution();
			post.facets = v.parse(postFacetsSchema, richText.facets ?? []);
			const segments = [...richText.segments()];

			editor
				.chain()
				.command(({ tr, state }) => {
					tr.setMeta('updatingMarks', true);

					state.doc.descendants((node, pos) => {
						node.marks.forEach((mark) => tr.removeMark(pos, pos + node.nodeSize, mark));
					});

					const links: {
						text: string;
						url: string;
						from: number;
						to: number;
					}[] = [];
					let charCount = 0;

					let sawLinkThatShouldNotCreateMediaFor = false;

					for (const segment of segments) {
						const segmentType = segment.isLink()
							? 'link'
							: segment.isMention()
								? 'mention'
								: segment.isTag()
									? 'tag'
									: 'text';

						if (segmentType !== 'text') {
							tr.addMark(
								charCount,
								charCount + segment.text.length + 1,
								editor.schema.marks[segmentType].create()
							);

							if (segment.link) {
								if (doNotCreateMediaForLinkText === segment.text)
									sawLinkThatShouldNotCreateMediaFor = true;

								links.push({
									text: segment.text,
									url: segment.link.uri,
									from: charCount,
									to: charCount + segment.text.length
								});
							}
						}

						charCount += segment.text.length;
					}

					if (!sawLinkThatShouldNotCreateMediaFor) {
						doNotCreateMediaForLinkText = undefined;
					}

					const cursorPosition = tr.selection.to - 1;

					if (untrack(() => post.media) === undefined) {
						for (const link of links) {
							if (
								(cursorPosition >= link.from && cursorPosition <= link.to && !didPasteThisUpdate) ||
								(cursorPosition === link.to + 1 && editorText[link.to].trim().length > 0) ||
								link.text === doNotCreateMediaForLinkText
							) {
								continue;
							}

							getLinkMeta(link.url)
								.then(({ title, description, image }) =>
									Promise.all([
										{ title, description },
										image ? fetch(image).then((response) => response.blob()) : null
									])
								)
								.then(([{ title, description }, imageBlob]) => {
									post.media = {
										type: 'website',
										website: {
											url: link.url,
											meta: {
												title,
												description,
												thumbnailBlob: imageBlob
													? new ThreadBlob(crypto.randomUUID(), imageBlob)
													: null
											},
											editorState: {
												linkText: link.text
											}
										}
									};
								});

							break;
						}
					}

					didPasteThisUpdate = false;

					return true;
				})
				.run();

			post.text = editorText;
		}

		const editor = new Editor({
			element: editorElement,
			content: untrack(() => post.text),
			autofocus: false,
			extensions: [
				Document,
				Paragraph,
				Text,
				Placeholder.configure({ placeholder: '' }),
				Link,
				Mention,
				Tag
			],

			onFocus() {
				becomeActive();
			},

			onSelectionUpdate() {
				post.editorState.textFocusPosition = editor.state.selection.anchor;
			},

			onCreate() {
				onEditorCreateOrUpdate();
				if (active) editor.commands.focus(post.editorState.textFocusPosition);
			},

			onUpdate({ transaction }) {
				if (transaction.getMeta('updatingMarks')) return;

				onEditorCreateOrUpdate();
			},

			onPaste() {
				didPasteThisUpdate = true;
			}
		});

		return () => editor.destroy();
	});

	$effect(() => {
		if (active) (editorElement?.querySelector('.tiptap') as HTMLElement | null)?.focus();
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div class={['post', { active }]}>
	<div class="main" role="button" onclick={() => becomeActive()}>
		<div class="left">
			<Avatar avatarSrc={author.avatarSrc} handle={author.handle} />
			{#if postCount > 1 && postIndex !== postCount - 1}<div class="thread-line"></div>{/if}
		</div>

		<div class="center">
			<div class="editor" bind:this={editorElement}></div>

			{#if post.media}
				<div class="media">
					{#if post.media.type === 'images'}
						<div class="images">
							{#each post.media.images as _, i}
								<ImageMedia
									bind:image={post.media.images[i]}
									onClickRemove={() => removeImage(i)}
								/>
							{/each}
						</div>
					{:else if post.media.type === 'video'}
						<VideoMedia
							bind:video={post.media.video}
							{setCaptions}
							onClickRemove={() => (post.media = null)}
						/>
					{:else if post.media.type === 'gif'}
						<GifMedia bind:gif={post.media.gif} onClickRemove={() => (post.media = null)} />
					{:else if post.media.type === 'website'}
						<WebsiteMedia
							website={post.media.website}
							onClickRemove={(website) => {
								doNotCreateMediaForLinkText = website.editorState.linkText;
								post.media = null;
							}}
						/>
					{/if}

					<div class="labelling-controls">
						<button type="button" onclick={() => (labelSelectorOpen = true)}>
							<ShieldIcon />{#if post.labels.adultContent || post.labels.other.length > 0}{[
									...(post.labels.adultContent
										? [adultContentLabelDefinitions[post.labels.adultContent].name]
										: []),
									...post.labels.other.map((label) => otherLabelDefinitions[label].name)
								].join(', ')}{:else}Labels{/if}</button
						>
					</div>
				</div>
			{/if}
		</div>

		{#if postCount > 1}
			<div class="right">
				{#if active}
					<button
						title="Delete Post in Thread"
						type="button"
						class="ghost delete-button"
						onclick={(e) => {
							e.stopImmediatePropagation();

							if (empty) {
								deletePost();
								return;
							}

							showConfirmDialog({
								text: ['Delete this post from the thread?'],
								confirm: {
									text: 'Delete',
									class: 'danger',
									onClick: () => deletePost()
								}
							});
						}}><CircleXIcon /></button
					>
				{/if}
			</div>
		{/if}
	</div>

	{#if active}
		<div class="bottom-bar">
			<div class="bar-left">
				<button
					title="Add Image"
					type="button"
					class="ghost accent"
					onclick={() => imagesInput?.click()}
					disabled={post.media &&
						(post.media.type !== 'images' || post.media.images.length >= imageLimit)}
					><ImageIcon /></button
				>
				<input
					bind:this={imagesInput}
					onchange={onImageInputChange}
					hidden
					type="file"
					accept="image/*"
					multiple
				/>

				<button
					title="Add Video"
					type="button"
					class="ghost accent"
					onclick={() => videoInput?.click()}
					disabled={!!post.media}><FilmIcon /></button
				>
				<input
					bind:this={videoInput}
					onchange={onVideoInputChange}
					hidden
					type="file"
					accept={supportedVideoTypes.join(',')}
				/>

				<button
					title="Add GIF"
					type="button"
					class="ghost accent"
					onclick={() => (gifDialogOpen = true)}
					disabled={!!post.media}><ImagePlayIcon /></button
				>
			</div>

			<div class="bar-right">
				<button
					disabled={empty}
					title="Add Post to Thread"
					type="button"
					class="ghost accent"
					onclick={() => addNewPostAfter()}><PlusIcon /></button
				>
				<div class="character-counter">
					<CharacterCounter text={post.text} maxGraphemes={300} />
				</div>
			</div>
		</div>
	{/if}
</div>

<LabelSelector bind:open={labelSelectorOpen} bind:post />

{#if gifDialogOpen}
	<Tenor bind:open={gifDialogOpen} bind:post />
{/if}

<canvas bind:this={imageCanvas} hidden></canvas>

<style>
	.post {
		display: flex;
		flex-direction: column;
		transition: filter 0.2s ease-in-out;
		--placeholder-text: "What's up?";

		--bottom-bar-height: 2.75rem;
		--bottom-bar-margin-top: 0.5rem;
		--bottom-bar-margin-bottom: 0.5rem;

		&:last-of-type {
			--bottom-bar-margin-bottom: 0rem;
		}

		.main {
			display: flex;
			flex-direction: row;
			gap: 1rem;
			margin-left: 0.5rem;
			margin-right: 0.5rem;

			.post:first-of-type & {
				margin-top: 0.5rem;
			}

			.left,
			.right {
				display: flex;
				flex-direction: column;
				justify-content: start;
				align-items: center;
			}

			.left {
				.thread-line {
					width: 2px;
					flex: 1;
					background-color: var(--border-color);
					margin-block: 0.25rem;
				}
			}

			.center {
				flex: 1;
				display: flex;
				flex-direction: column;
				gap: 2rem;

				.editor {
					font-size: 1.2rem;

					:global(.tiptap) {
						min-height: 6rem;
						overflow-wrap: anywhere;

						&:focus {
							outline: none;
						}

						& p.is-editor-empty:first-child::before {
							content: var(--placeholder-text);
							pointer-events: none;
							opacity: 0.5;
							float: left;
							height: 0;
						}
					}
				}

				.media {
					display: flex;
					flex-direction: column;
					gap: 0.5rem;
				}

				.images {
					display: flex;
					flex-direction: row;
					justify-content: space-between;
					gap: 8px;
				}
			}
		}

		.right {
			width: 2rem;

			.delete-button {
				padding: 0.25rem;
			}
		}

		.bottom-bar {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			height: var(--bottom-bar-height);
			margin-top: var(--bottom-bar-margin-top);
			margin-bottom: var(--bottom-bar-margin-bottom);

			.bar-left,
			.bar-right {
				display: flex;
				flex-direction: row;
				align-items: center;
			}

			.bar-left {
				justify-content: start;
			}

			.bar-right {
				justify-content: end;

				.character-counter {
					padding-inline: var(--button-padding);
				}
			}
		}
	}

	.post:not(.active) {
		filter: opacity(0.5);

		.center {
			margin-bottom: calc(
				var(--bottom-bar-height) + var(--bottom-bar-margin-top) + var(--bottom-bar-margin-bottom)
			);
		}
	}

	.post:not(:first-child) {
		--placeholder-text: 'Add another post';
	}

	:global(.link-facet, .mention-facet, .tag-facet) {
		color: var(--accent-color);
	}
</style>
