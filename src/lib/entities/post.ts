import * as v from 'valibot';
import { adultContentLabelSchema, otherLabelSchema } from './labels';
import { imagesMediaDataSchema } from './media/images';
import { videoMediaDataSchema } from './media/video';
import { gifMediaDataSchema } from './media/gif';
import { websiteMediaDataSchema } from './media/website';
import type { Editability } from './editability';
import { notPresent } from './not-present';

const byteSliceSchema = v.object({ byteStart: v.number(), byteEnd: v.number() });
const facetSchema = v.object({
	index: byteSliceSchema,
	features: v.array(
		v.union([
			v.object({ $type: v.literal('app.bsky.richtext.facet#mention'), did: v.string() }),
			v.object({ $type: v.literal('app.bsky.richtext.facet#tag'), tag: v.string() }),
			v.object({ $type: v.literal('app.bsky.richtext.facet#link'), uri: v.string() })
		])
	)
});

export const postFacetsSchema = v.array(facetSchema);

const buildPostSchema = <E extends Editability>(editability: E) =>
	v.object({
		text: v.string(),
		facets: postFacetsSchema,
		labels: v.object({
			adultContent: adultContentLabelSchema,
			other: v.array(otherLabelSchema)
		}),
		media: v.union([
			v.null(),
			v.object({
				type: v.literal('images'),
				images: imagesMediaDataSchema(editability)
			}),
			v.object({
				type: v.literal('video'),
				video: videoMediaDataSchema(editability)
			}),
			v.object({
				type: v.literal('gif'),
				gif: gifMediaDataSchema(editability)
			}),
			v.object({
				type: v.literal('website'),
				website: websiteMediaDataSchema(editability)
			})
		]),
		editorState: { uneditable: notPresent, editable: v.object({ textFocusPosition: v.number() }) }[
			editability
		]
	});

const postSchemas = {
	uneditable: buildPostSchema('uneditable'),
	editable: buildPostSchema('editable')
} as const;

export const postSchema = <E extends Editability>(editability: E) => postSchemas[editability];

type GenericPost<E extends Editability> = v.InferOutput<(typeof postSchemas)[E]>;
export type Post = GenericPost<'uneditable'>;
export type EditablePost = GenericPost<'editable'>;

export function getPostLabelArray(labels: Post['labels']) {
	return [...(labels.adultContent ? [labels.adultContent] : []), ...labels.other];
}
