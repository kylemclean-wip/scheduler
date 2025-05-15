import { db } from '$lib/server/db/index.js';
import { threadRefSerializer } from '$lib/server/serializers/thread-ref';
import { error } from '@sveltejs/kit';

export async function load({ locals }) {
	const user = locals.user;
	if (!user) error(401);

	const threadRefs = (
		await db.query.threadRef.findMany({
			where: (threadRef, { and, eq, isNull }) =>
				and(
					eq(threadRef.postAsDid, user.id),
					isNull(threadRef.scheduledFor),
					isNull(threadRef.postedAt)
				)
		})
	).map(threadRefSerializer);

	return { threadRefs };
}
