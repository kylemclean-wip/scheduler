import * as v from 'valibot';
import type { StoredThread, StoredThreadBlob } from './bsky-store';

// TODO: port to Hono client

export const uploadBlobRequestSchema = v.object({
	storedThreadKey: v.string(),
	blobCid: v.string(),
	blobDid: v.string(),
	blobMimeType: v.string(),
	postAsDid: v.string()
});
type UploadBlobRequest = v.InferOutput<typeof uploadBlobRequestSchema>;

const uploadBlobResponseSchema = v.union([
	v.object({ cid: v.string() }),
	v.object({ jobId: v.string() })
]);
export type UploadBlobResponse = v.InferOutput<typeof uploadBlobResponseSchema>;

export class InternalApi {
	private baseUrl: string;
	private token: string;

	constructor(baseUrl: string, token: string) {
		this.baseUrl = baseUrl;
		this.token = token;
	}

	async uploadBlob(storedThreadKey: string, storedThreadBlob: StoredThreadBlob, postAsDid: string) {
		const response = await fetch(`${this.baseUrl}/api/internal/threads/upload-blob`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				storedThreadKey,
				blobCid: storedThreadBlob.blobRef.ref.$link,
				blobDid: storedThreadBlob.did,
				blobMimeType: storedThreadBlob.meta.mimeType,
				postAsDid
			} satisfies UploadBlobRequest)
		});

		if (!response.ok) {
			throw new Error('Failed to upload blob for thread');
		}

		return v.parse(uploadBlobResponseSchema, await response.json());
	}
}
