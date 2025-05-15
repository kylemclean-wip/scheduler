import { AtUri, type Agent } from '@atproto/api';
import * as v from 'valibot';
import { base64ToBytes, bytesToBase64 } from './base64';
import { getThreadBlobs, threadSchema, type EditableThread } from './entities/thread';
import { decryptJson, encryptData, encryptJson, exportJwk, generateEncryptionKey } from './crypto';

const encryptedStoredThreadSchema = v.object({
	$type: v.literal('io.github.kylemclean.scheduler.experimental.storedThread'),
	thread: v.string(),
	blobs: v.record(
		v.string(),
		v.object({
			blobRef: v.object({
				$type: v.literal('blob'),
				ref: v.object({ $link: v.string() }),
				mimeType: v.literal('application/octet-stream'),
				size: v.pipe(v.number(), v.integer(), v.minValue(0))
			}),
			meta: v.string()
		})
	)
});
type EncryptedStoredThread = v.InferOutput<typeof encryptedStoredThreadSchema>;

const storedThreadBlobMetaSchema = v.object({
	mimeType: v.string()
});
type StoredThreadBlobMeta = v.InferOutput<typeof storedThreadBlobMetaSchema>;

export async function loadThreadKey(keyString: string) {
	return await crypto.subtle.importKey('jwk', JSON.parse(keyString), 'AES-GCM', false, ['decrypt']);
}

export async function fetchStoredThread(
	threadRef: { storedThreadUri: string; storedThreadKey: string },
	agent: Agent
) {
	// ===============================================================
	// 1. Fetch the encrypted stored thread
	// ===============================================================

	const storedThreadAtUri = new AtUri(threadRef.storedThreadUri);
	const response = await agent.com.atproto.repo.getRecord({
		collection: storedThreadAtUri.collection,
		repo: storedThreadAtUri.host,
		rkey: storedThreadAtUri.rkey
	});

	if (!response.success) {
		throw new Error('Failed to fetch stored thread');
	}

	const encryptedStoredThread = v.parse(encryptedStoredThreadSchema, response.data.value);

	// ===============================================================
	// 2. Decrypt the stored thread and blob references
	// ===============================================================

	const key = await loadThreadKey(threadRef.storedThreadKey);

	const blobs = Object.fromEntries(
		await Promise.all(
			Object.entries(encryptedStoredThread.blobs).map(async ([id, blob]) => {
				const { meta: metaPayload, ...rest } = blob;
				const binaryMeta = base64ToBytes(metaPayload);
				const metaJson = await decryptJson(binaryMeta, key);
				const meta = v.parse(storedThreadBlobMetaSchema, metaJson);
				return [id, { ...rest, did: storedThreadAtUri.host, meta }] as const;
			})
		)
	);

	const threadPayload = base64ToBytes(encryptedStoredThread.thread);
	const threadJson = await decryptJson(threadPayload, key);
	const thread = v.parse(threadSchema('uneditable'), threadJson);

	// ===============================================================
	// 3. Set the stored thread blobs on the thread's blob references
	// ===============================================================

	getThreadBlobs(thread)
		.flat()
		.forEach((blob) => {
			const storedThreadBlob = blobs[blob.id];
			if (!storedThreadBlob) console.warn(`Blob ${blob.id} not found in stored thread`);
			blob.dataSource = { type: 'remoteEncrypted', storedThreadBlob, key };
		});

	return { thread, blobs };
}
export type StoredThread = Awaited<ReturnType<typeof fetchStoredThread>>;
export type StoredThreadBlob = StoredThread['blobs'][string];

export async function uploadBlobsAndStoreThread(editableThread: EditableThread, agent: Agent) {
	if (!agent.did) throw new Error('You must be logged in to store a thread');
	if (editableThread.posts.length === 0) throw new Error('Thread must have at least one post');

	const thread = v.parse(threadSchema('uneditable'), editableThread);

	const allThreadBlobsByPost = getThreadBlobs(thread);

	const encryptionKey = await generateEncryptionKey();
	const encryptionJwk = await exportJwk(encryptionKey);

	const blobs: Record<string, StoredThreadBlob> = Object.fromEntries(
		await Promise.all(
			allThreadBlobsByPost.flat().map(async (threadBlob) => {
				if (!threadBlob.dataSource) throw new Error('Thread blob does not have a data source');

				if (threadBlob.dataSource.type === 'remoteEncrypted')
					return [threadBlob.id, threadBlob.dataSource.storedThreadBlob];

				if (threadBlob.dataSource.type !== 'local') {
					throw new Error(
						'Cannot handle threadBlob.dataSource of type ' + threadBlob.dataSource.type
					);
				}

				const localBlobData = new Uint8Array(await threadBlob.dataSource.blob.arrayBuffer());
				const encryptedBlobData = await encryptData(localBlobData, encryptionKey);
				const uploadResponse = await agent.com.atproto.repo.uploadBlob(encryptedBlobData, {
					headers: { 'Content-Type': 'application/octet-stream' }
				});

				if (!uploadResponse.success) throw new Error('Failed to upload blob');

				return [
					threadBlob.id,
					{
						blobRef: uploadResponse.data.blob.toJSON() as any,
						meta: threadBlob.meta,
						did: agent.did!
					} satisfies StoredThreadBlob
				];
			})
		)
	);

	const blobsWithEncryptedMeta = Object.fromEntries(
		await Promise.all(
			Object.entries(blobs).map(async ([id, blob]) => {
				const encryptedMeta = bytesToBase64(await encryptJson(blob.meta, encryptionKey));
				return [id, { ...blob, meta: encryptedMeta }];
			})
		)
	);

	const storedThread = {
		$type: 'io.github.kylemclean.scheduler.experimental.storedThread',
		thread: bytesToBase64(await encryptJson(thread, encryptionKey)),
		blobs: blobsWithEncryptedMeta
	} satisfies EncryptedStoredThread;

	const createResponse = await agent.com.atproto.repo.createRecord({
		collection: 'io.github.kylemclean.scheduler.experimental.storedThread',
		repo: agent.did,
		record: storedThread
	});

	const prefetchBlobCids = allThreadBlobsByPost[0].map(
		(threadBlob) => blobs[threadBlob.id].blobRef.ref.$link
	);

	return {
		storedThreadUri: createResponse.data.uri,
		storedThreadKey: JSON.stringify(encryptionJwk),
		blobIds: Object.keys(blobs),
		prefetchBlobCids
	};
}
