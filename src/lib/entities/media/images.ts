import * as v from 'valibot';
import { threadBlobSchema } from './thread-blob';
import type { Editability } from '../editability';

const buildImagesMediaDataSchema = <E extends Editability>(editability: E) =>
	v.array(
		v.object({
			alt: v.string(),
			size: v.object({ width: v.number(), height: v.number() }),
			imageBlob: threadBlobSchema
		})
	);

const schemas = {
	uneditable: buildImagesMediaDataSchema('uneditable'),
	editable: buildImagesMediaDataSchema('editable')
} as const;

export const imagesMediaDataSchema = <E extends Editability>(editability: E) =>
	schemas[editability];

type GenericImagesMediaData<E extends Editability> = v.InferOutput<(typeof schemas)[E]>;
export type ImagesMediaData = GenericImagesMediaData<'uneditable'>;
export type EditableImagesMediaData = GenericImagesMediaData<'editable'>;
