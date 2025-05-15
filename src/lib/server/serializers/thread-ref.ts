import type { threadRef as ThreadRefTable } from '$lib/server/db/schema';

export function threadRefSerializer(threadRef: typeof ThreadRefTable.$inferSelect) {
	return {
		storedThreadUri: threadRef.storedThreadUri,
		storedThreadKey: threadRef.storedThreadKey,
		postAsDid: threadRef.postAsDid,
		scheduledFor: threadRef.scheduledFor,
		prefetchBlobCids: threadRef.prefetchBlobCids
	};
}

export type SerializedThreadRef = ReturnType<typeof threadRefSerializer>;
