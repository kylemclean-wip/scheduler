import * as v from 'valibot';
import { threadBlobSchema } from './thread-blob';
import type { Editability } from '../editability';

const buildVideoMediaDataSchema = <E extends Editability>(editability: E) =>
	v.object({
		alt: v.string(),
		size: v.object({ width: v.number(), height: v.number() }),
		videoBlob: threadBlobSchema,
		captionsBlob: v.nullable(threadBlobSchema)
	});

const schemas = {
	uneditable: buildVideoMediaDataSchema('uneditable'),
	editable: buildVideoMediaDataSchema('editable')
} as const;

export const videoMediaDataSchema = <E extends Editability>(editability: E) => schemas[editability];

export type GenericVideoMediaData<E extends Editability> = v.InferOutput<(typeof schemas)[E]>;
export type VideoMediaData = GenericVideoMediaData<'uneditable'>;
export type EditableVideoMediaData = GenericVideoMediaData<'editable'>;
