import { db } from '$lib/server/db/index.js';
import { threadRefSerializer } from '$lib/server/serializers/thread-ref';
import { error } from '@sveltejs/kit';

export async function load({ locals }) {
	const user = locals.user;
	if (!user) error(401);

	const threadRefs = (
		await db.query.threadRef.findMany({
			where: (threadRef, { and, eq, isNull, isNotNull }) =>
				and(
					eq(threadRef.postAsDid, user.id),
					isNotNull(threadRef.scheduledFor),
					isNull(threadRef.postedAt)
				),
			limit: 10
		})
	).map(threadRefSerializer);

	return { threadRefs };
}
