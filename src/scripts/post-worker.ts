import { Agent, AppBskyFeedPost, AtUri } from '@atproto/api';
import { TID } from '@atproto/common-web';
import { and, isNotNull, isNull, lte, or } from 'drizzle-orm';
import { fetchStoredThread, loadThreadKey } from '@/lib/bsky-store';
import { db } from '@/lib/server/db';
import * as schema from '@/lib/server/db/schema';
import { serverOAuthClient } from '@/lib/server/server-bsky-oauth';
import { InternalApi } from '@/lib/internal-api';
import { computeCid } from '@/lib/cid';
import { deepAwait, type DeepAwaited } from '../lib/deep-await';
import { getThreadBlobs } from '@/lib/entities/thread';
import { getPostLabelArray, type Post } from '@/lib/entities/post';
import type { ThreadBlob } from '@/lib/entities/media/thread-blob';

const baseUrl = process.env.POST_WORKER_API_BASE_URL || process.env.PUBLIC_SCHEDULER_APP_URL;
if (!baseUrl) throw new Error('POST_WORKER_API_BASE_URL is not set');

const authToken = process.env.POST_WORKER_AUTH_TOKEN;
if (!authToken) throw new Error('POST_WORKER_AUTH_TOKEN is not set');

const internalApi = new InternalApi(baseUrl, authToken);

// How long before a post's scheduled time to upload its blobs.
const BLOB_UPLOAD_SECONDS = 30 * 60;

// How long after starting a blob upload to retry it.
const BLOB_UPLOAD_RETRY_SECONDS = 10 * 60;

// The maximum duration after a post's scheduled time to attempt to post it.
const MAX_POST_DELAY_SECONDS = 5 * 60;

// How long after attempting to post a thread to retry it.
const POST_RETRY_SECONDS = 1 * 60;

async function obtainScheduledThreadsWithBlobsToUpload() {
	const now = new Date();

	return await db
		.update(schema.threadRef)
		.set({
			blobUploadOrPostAttemptedAt: now
		})
		.where(
			and(
				isNull(schema.threadRef.postedAt),
				isNull(schema.threadRef.blobsUploadedAt),
				or(
					isNull(schema.threadRef.blobUploadOrPostAttemptedAt),
					lte(
						schema.threadRef.blobUploadOrPostAttemptedAt,
						new Date(now.getTime() - BLOB_UPLOAD_RETRY_SECONDS * 1000)
					)
				),
				isNotNull(schema.threadRef.scheduledFor),
				lte(schema.threadRef.scheduledFor, new Date(now.getTime() + BLOB_UPLOAD_SECONDS * 1000))
			)
		)
		.returning({
			storedThreadUri: schema.threadRef.storedThreadUri,
			storedThreadKey: schema.threadRef.storedThreadKey,
			postAsDid: schema.threadRef.postAsDid,
			blobDecryptionMap: schema.threadRef.blobDecryptionMap
		});
}

async function uploadBlobsForScheduledThreads() {
	const threadRefs = await obtainScheduledThreadsWithBlobsToUpload();
	await Promise.all(threadRefs.map(uploadBlobsForThread));
}

async function uploadBlobsForThread({
	storedThreadUri,
	storedThreadKey,
	postAsDid,
	blobDecryptionMap: oldBlobDecryptionMap
}: Awaited<ReturnType<typeof obtainScheduledThreadsWithBlobsToUpload>>[number]) {
	const posterSession = await serverOAuthClient.restore(postAsDid);
	const posterAgent = new Agent(posterSession);

	const storedThread = await fetchStoredThread({ storedThreadUri, storedThreadKey }, posterAgent);

	const blobsToUpload = Object.entries(storedThread.blobs)
		.filter(([blobId]) => oldBlobDecryptionMap[blobId] ?? null === null)
		.map(([blobId, blob]) => ({ blobId, blob }));

	const results = await Promise.allSettled(
		blobsToUpload.map(async ({ blobId, blob }) => ({
			blobId,
			responseData: await internalApi.uploadBlob(storedThreadKey, blob, postAsDid)
		}))
	);

	const newBlobDecryptionMap = { ...oldBlobDecryptionMap };
	for (const result of results) {
		if (result.status !== 'fulfilled') continue;
		const { blobId, responseData } = result.value;
		newBlobDecryptionMap[blobId] = responseData;
	}

	const updateData: Partial<typeof schema.threadRef.$inferInsert> = {
		blobUploadOrPostAttemptedAt: null,
		blobDecryptionMap: newBlobDecryptionMap
	};

	const uploadedCount = Object.values(newBlobDecryptionMap).reduce(
		(acc, val) => acc + (val === null ? 0 : 1),
		0
	);
	if (uploadedCount >= Object.keys(storedThread.blobs).length) {
		updateData.blobsUploadedAt = new Date();
	}

	await db.update(schema.threadRef).set(updateData);
}

async function obtainScheduledThreadsToPost() {
	const now = new Date();

	return await db
		.update(schema.threadRef)
		.set({
			blobUploadOrPostAttemptedAt: now
		})
		.where(
			and(
				isNull(schema.threadRef.postedAt),
				isNotNull(schema.threadRef.blobsUploadedAt),
				or(
					isNull(schema.threadRef.blobUploadOrPostAttemptedAt),
					lte(
						schema.threadRef.blobUploadOrPostAttemptedAt,
						new Date(now.getTime() - POST_RETRY_SECONDS * 1000)
					)
				),
				isNotNull(schema.threadRef.scheduledFor),
				lte(schema.threadRef.scheduledFor, now),
				lte(schema.threadRef.scheduledFor, new Date(now.getTime() - MAX_POST_DELAY_SECONDS * 1000))
			)
		)
		.returning({
			storedThreadUri: schema.threadRef.storedThreadUri,
			storedThreadKey: schema.threadRef.storedThreadKey,
			postAsDid: schema.threadRef.postAsDid,
			blobDecryptionMap: schema.threadRef.blobDecryptionMap
		});
}

async function postScheduledThreads() {
	const threadRefs = await obtainScheduledThreadsToPost();
	await Promise.all(threadRefs.map(postThread));
}

const tidClockId = Math.floor(Math.random() * 32);

async function postThread({
	storedThreadUri,
	storedThreadKey,
	postAsDid,
	blobDecryptionMap
}: Awaited<ReturnType<typeof obtainScheduledThreadsToPost>>[number]) {
	const posterSession = await serverOAuthClient.restore(postAsDid);
	const posterAgent = new Agent(posterSession);

	const storedThread = await fetchStoredThread({ storedThreadUri, storedThreadKey }, posterAgent);
	const threadBlobs = getThreadBlobs(storedThread.thread);

	await Promise.all(
		threadBlobs.flat().map(async (blob) => {
			const mappedValue = blobDecryptionMap[blob.id];
			if (!mappedValue) throw new Error(`Blob ${blob.id} not found in decryption map`);

			if ('cid' in mappedValue) {
				blob.dataSource = {
					type: 'remoteUnencrypted',
					unencryptedBlob: {
						did: postAsDid,
						blobRef: { ref: { $link: mappedValue.cid }, mimeType: blob.meta.mimeType }
					}
				};
			} else if ('jobId' in mappedValue) {
				const jobStatusResponse = await posterAgent.app.bsky.video.getJobStatus({
					jobId: mappedValue.jobId
				});
				if (!jobStatusResponse.success || !jobStatusResponse.data.jobStatus.blob)
					throw new Error(
						`jobId ${mappedValue.jobId} not complete for stored thread ${storedThreadUri}`
					);

				blob.dataSource = {
					type: 'remoteUnencrypted',
					unencryptedBlob: {
						did: postAsDid,
						blobRef: jobStatusResponse.data.jobStatus.blob.toJSON() as any
					}
				};
			}
		})
	);

	const awaitedThread = await deepAwait(storedThread.thread);

	const now = new Date();
	const items: { record: AppBskyFeedPost.Record; ref: { cid: string; uri: string } }[] = [];

	for (let postIndex = 0; postIndex < awaitedThread.posts.length; postIndex++) {
		const post = awaitedThread.posts[postIndex];
		const labels = getPostLabelArray(post.labels);

		const record = {
			text: post.text,
			facets: post.facets.length === 0 ? undefined : post.facets,
			langs: awaitedThread.languages,
			createdAt: now.toISOString(),
			reply: postIndex > 0 ? { parent: items[postIndex - 1].ref, root: items[0].ref } : undefined,
			labels:
				labels.length > 0
					? { $type: 'com.atproto.label.defs#selfLabels', values: labels }
					: undefined,
			embed: makePostEmbed(post)
		} satisfies AppBskyFeedPost.Record;

		items.push({
			record,
			ref: {
				cid: await computeCid(record),
				uri: `at://${postAsDid}/app.bsky.feed.post/${TID.fromTime(now.getTime() * 1000 + postIndex, tidClockId).toString()}`
			}
		});
	}

	const writes = items.map(({ record, ref }) => ({
		$type: 'com.atproto.repo.applyWrites#create',
		collection: 'app.bsky.feed.post',
		rkey: new AtUri(ref.uri).rkey,
		value: record
	}));

	await posterAgent.com.atproto.repo.applyWrites({
		repo: postAsDid,
		writes
	});
}

function makeBlobRef(threadBlob: DeepAwaited<ThreadBlob>) {
	if (threadBlob.dataSource?.type !== 'remoteUnencrypted')
		throw new Error('makeBlobRef called on non-remoteUnencrypted blob');

	return threadBlob.dataSource.unencryptedBlob.blobRef;
}

function makePostEmbed(post: DeepAwaited<Post>): AppBskyFeedPost.Record['embed'] {
	if (!post.media) return undefined;

	if (post.media.type === 'images') {
		return {
			$type: 'app.bsky.embed.images',
			images: post.media.images.map((image) => ({
				image: makeBlobRef(image.imageBlob),
				aspectRatio: {
					width: image.size.width,
					height: image.size.height
				},
				alt: image.alt
			}))
		};
	}

	if (post.media.type === 'video') {
		return {
			$type: 'app.bsky.embed.video',
			video: makeBlobRef(post.media.video.videoBlob),
			captions: post.media.video.captionsBlob
				? makeBlobRef(post.media.video.captionsBlob)
				: undefined,
			aspectRatio: {
				width: post.media.video.size.width,
				height: post.media.video.size.height
			},
			alt: post.media.video.alt
		};
	}

	if (post.media.type === 'gif') {
		return {
			$type: 'app.bsky.embed.external',
			external: {
				uri: post.media.gif.src,
				title: post.media.gif.alt,
				description: `Alt: ${post.media.gif.alt}`,
				thumb: makeBlobRef(post.media.gif.thumbnailBlob)
			}
		};
	}
	if (post.media.type === 'website') {
		return {
			$type: 'app.bsky.embed.external',
			external: {
				uri: post.media.website.url,
				title: post.media.website.meta.title,
				description: post.media.website.meta.description,
				thumb: post.media.website.meta.thumbnailBlob
					? makeBlobRef(post.media.website.meta.thumbnailBlob)
					: undefined
			}
		};
	}

	console.error('Unsupported media', post.media);
	throw new Error('Unsupported media');
}
