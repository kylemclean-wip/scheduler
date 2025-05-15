import * as v from 'valibot';
import { threadBlobSchema } from './thread-blob';
import type { Editability } from '../editability';
import { notPresent } from '../not-present';

const buildWebsiteMediaDataSchema = <E extends Editability>(editability: E) =>
	v.object({
		url: v.string(),
		meta: v.object({
			title: v.string(),
			description: v.string(),
			thumbnailBlob: v.nullable(threadBlobSchema)
		}),
		editorState: {
			uneditable: notPresent,
			editable: v.object({ linkText: v.string() })
		}[editability]
	});

const schemas = {
	uneditable: buildWebsiteMediaDataSchema('uneditable'),
	editable: buildWebsiteMediaDataSchema('editable')
} as const;

export const websiteMediaDataSchema = <E extends Editability>(editability: E) =>
	schemas[editability];

type GenericWebsiteMediaData<E extends Editability> = v.InferOutput<(typeof schemas)[E]>;
export type WebsiteMediaData = GenericWebsiteMediaData<'uneditable'>;
export type EditableWebsiteMediaData = GenericWebsiteMediaData<'editable'>;
