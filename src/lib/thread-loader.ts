import { Agent } from '@atproto/api';
import type { SerializedThreadRef } from './server/serializers/thread-ref';
import { fetchStoredThread } from './bsky-store';
import type { Author } from './author';
import type { PendingThread } from './entities/thread';

export async function loadThreads(threadRefs: SerializedThreadRef[], author: Author) {
	const agent = new Agent('https://bsky.social');

	const threads = await Promise.all(
		threadRefs.map(async (threadRef) => {
			try {
				const storedThread = await fetchStoredThread(threadRef, agent);

				return {
					pendingThread: {
						thread: storedThread.thread,
						author,
						scheduledFor: threadRef.scheduledFor,
						storedThreadUri: threadRef.storedThreadUri
					} satisfies PendingThread
				};
			} catch (error) {
				console.warn(error);
				return { error: (error as Error).message };
			}
		})
	);

	return threads;
}
