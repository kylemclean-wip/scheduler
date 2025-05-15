import * as v from 'valibot';
import { threadBlobSchema } from './thread-blob';
import type { Editability } from '../editability';

const buildGifMediaDataSchema = <E extends Editability>(editability: E) =>
	v.object({
		src: v.string(),
		alt: v.string(),
		extra: v.optional(
			v.object({
				text: v.string(),
				url: v.string()
			})
		),
		thumbnailBlob: threadBlobSchema
	});

const schemas = {
	uneditable: buildGifMediaDataSchema('uneditable'),
	editable: buildGifMediaDataSchema('editable')
} as const;

export const gifMediaDataSchema = <E extends Editability>(editability: E) => schemas[editability];

type GenericGifMediaData<E extends Editability> = v.InferOutput<(typeof schemas)[E]>;
export type GifMediaData = GenericGifMediaData<'uneditable'>;
export type EditableGifMediaData = GenericGifMediaData<'editable'>;
