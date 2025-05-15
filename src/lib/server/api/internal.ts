import { Hono } from 'hono';
import * as v from 'valibot';
import { vValidator } from '@hono/valibot-validator';
import { Agent } from '@atproto/api';
import type { HonoType } from './api';
import { serverOAuthClient } from '../server-bsky-oauth';
import { loadThreadKey } from '@/lib/bsky-store';
import { fetchAndDecryptBlob } from '@/lib/entities/media/thread-blob';

const uploadBlobInput = v.object({
	storedThreadKey: v.string(),
	blobCid: v.string(),
	blobDid: v.string(),
	blobMimeType: v.string(),
	postAsDid: v.string()
});

export const internalRoutes = new Hono<HonoType>().post(
	'/threads/upload-blob',
	vValidator('json', uploadBlobInput),
	async (c) => {
		const { storedThreadKey, blobCid, blobDid, blobMimeType, postAsDid } = c.req.valid('json');

		const posterSession = await serverOAuthClient.restore(postAsDid);
		const posterAgent = new Agent(posterSession);

		const key = await loadThreadKey(storedThreadKey);
		const decryptedBlob = await fetchAndDecryptBlob(
			{ cid: blobCid, did: blobDid, mimeType: blobMimeType },
			key,
			posterAgent
		);

		let responseData;

		if (blobMimeType.startsWith('video/')) {
			const videoUploadResponse = await posterAgent.app.bsky.video.uploadVideo(decryptedBlob);
			if (!videoUploadResponse.success) {
				throw new Error('Failed to upload video');
			}

			responseData = {
				jobId: videoUploadResponse.data.jobStatus.jobId
			};
		} else {
			const blobUploadResponse = await posterAgent.com.atproto.repo.uploadBlob(decryptedBlob);
			if (!blobUploadResponse.success) {
				throw new Error('Failed to upload blob');
			}

			const uploadedBlobRef = blobUploadResponse.data.blob.toJSON() as { ref: { $link: string } };
			responseData = { cid: uploadedBlobRef.ref.$link };
		}

		return c.json(responseData);
	}
);
