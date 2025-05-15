import * as v from 'valibot';
import { postSchema } from './post';
import { postLanguageSchema } from './post-languages';
import type { Editability } from './editability';
import { notPresent } from './not-present';
import type { ThreadBlob } from './media/thread-blob';
import type { Author } from '../author';

const interactionSettingsSchema = v.object({
	quotes: v.boolean(),
	replies: v.picklist(['all', 'mentioned', 'followed', 'mentioned-and-followed', 'none'])
});
export type InteractionSettings = v.InferOutput<typeof interactionSettingsSchema>;

const postVisibilitySchema = v.variant('type', [
	v.object({
		type: v.literal('scheduled'),
		scheduledDate: v.object({
			year: v.number(),
			month: v.number(),
			day: v.number(),
			hour: v.number(),
			minute: v.number()
		})
	}),
	v.object({ type: v.literal('draft') }),
	v.object({ type: v.literal('post-now') })
]);

const buildThreadSchema = <E extends Editability>(editability: E) =>
	v.object({
		posts: v.array(postSchema(editability)),
		interactionSettings: interactionSettingsSchema,
		languages: v.array(postLanguageSchema),
		editorState: {
			uneditable: notPresent,
			editable: v.object({ postVisibility: postVisibilitySchema })
		}[editability]
	});

const schemas = {
	editable: buildThreadSchema('editable'),
	uneditable: buildThreadSchema('uneditable')
} as const;

export const threadSchema = <E extends Editability>(editability: E) => schemas[editability];

type GenericThread<E extends Editability> = v.InferOutput<(typeof schemas)[E]>;
export type Thread = GenericThread<'uneditable'>;
export type EditableThread = GenericThread<'editable'>;

export type PendingThread = {
	thread: Thread;
	author: Author;
	scheduledFor: Date | null;
	storedThreadUri: string;
};

export function getThreadBlobs(thread: Thread) {
	return thread.posts.map((post) => {
		const postBlobs: ThreadBlob[] = [];

		if (!post.media) return postBlobs;

		if (post.media.type === 'images') {
			postBlobs.push(...post.media.images.map(({ imageBlob }) => imageBlob));
		} else if (post.media.type === 'video') {
			postBlobs.push(post.media.video.videoBlob);
			if (post.media.video.captionsBlob) postBlobs.push(post.media.video.captionsBlob);
		} else if (post.media.type === 'gif') {
			postBlobs.push(post.media.gif.thumbnailBlob);
		} else if (post.media.type === 'website') {
			if (post.media.website.meta.thumbnailBlob)
				postBlobs.push(post.media.website.meta.thumbnailBlob);
		}

		return postBlobs;
	});
}
