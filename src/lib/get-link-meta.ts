import * as v from 'valibot';

const extractSchema = v.union([
	v.object({ Error: v.string() }),
	v.object({
		error: v.string(),
		likely_type: v.string(),
		url: v.string(),
		title: v.string(),
		description: v.string(),
		image: v.string()
	})
]);

export async function getLinkMeta(url: string) {
	const params = new URLSearchParams({ url });
	return await fetch(`https://cardyb.bsky.app/v1/extract?${params.toString()}`)
		.then((response) => response.json())
		.then((json) => v.parse(extractSchema, json))
		.then((result) => {
			if ('Error' in result) throw new Error(result.Error);
			if (result.error) throw new Error(result.error);

			return {
				likelyType: result.likely_type,
				url: result.url,
				title: result.title,
				description: result.description,
				image: result.image
			};
		});
}
