import * as v from 'valibot';

export const adultContentLabelSchema = v.union([
	v.literal(''),
	v.literal('sexual'),
	v.literal('nudity'),
	v.literal('porn')
]);
type AdultContentLabel = v.InferOutput<typeof adultContentLabelSchema>;

export const adultContentLabelDefinitions: Record<AdultContentLabel, { name: string }> = {
	'': { name: 'None' },
	sexual: { name: 'Suggestive' },
	nudity: { name: 'Nudity' },
	porn: { name: 'Adult' }
};

export const otherLabelSchema = v.literal('graphic-media');
type OtherLabel = v.InferOutput<typeof otherLabelSchema>;

export const otherLabelDefinitions: Record<OtherLabel, { name: string }> = {
	'graphic-media': { name: 'Graphic Media' }
};
