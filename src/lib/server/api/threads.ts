import { Hono } from 'hono';
import * as v from 'valibot';
import { vValidator } from '@hono/valibot-validator';
import { HTTPException } from 'hono/http-exception';
import type { HonoType } from './api';
import { AtUri } from '@atproto/api';
import { db } from '../db';
import * as schema from '../db/schema';
import { dev } from '$app/environment';
import { and, eq } from 'drizzle-orm';

const createThreadInput = v.object({
	storedThreadUri: v.string(),
	storedThreadKey: v.string(),
	postAsDid: v.string(),
	prefetchBlobCids: v.array(v.string()),
	blobIds: v.array(v.string()),
	scheduledFor: v.nullable(
		v.pipe(
			v.string(),
			v.isoTimestamp(),
			v.transform((s) => new Date(s))
		)
	)
});

const updateThreadInput = v.pick(createThreadInput, [
	'prefetchBlobCids',
	'blobIds',
	'scheduledFor'
]);

export const threadsRoutes = new Hono<HonoType>()
	.post('/', vValidator('json', createThreadInput), async (c) => {
		if (!c.env.locals.user) throw new HTTPException(401);

		const data = c.req.valid('json');

		if (data.postAsDid !== c.env.locals.user.id) throw new HTTPException(403);

		try {
			const storedThreadAtUri = new AtUri(data.storedThreadUri);
			if (
				storedThreadAtUri.hostname !== c.env.locals.user.id ||
				storedThreadAtUri.collection !== 'io.github.kylemclean.scheduler.experimental.storedThread'
			) {
				throw new Error('Invalid stored thread URI');
			}
		} catch {
			return Response.json({ error: 'INVALID_STORED_THREAD_URI' }, { status: 400 });
		}

		try {
			await db.insert(schema.threadRef).values({
				postAsDid: data.postAsDid,
				storedThreadUri: data.storedThreadUri,
				storedThreadKey: data.storedThreadKey,
				prefetchBlobCids: data.prefetchBlobCids,
				blobDecryptionMap: Object.fromEntries(data.blobIds.map((blobId) => [blobId, null])),
				scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null
			});
		} catch (e) {
			console.error(e);
			return Response.json({ error: 'FAILED_TO_CREATE_THREAD_REF' }, { status: 500 });
		}

		return c.json(null, { status: 200 });
	})
	.post('/:storedThreadUri', vValidator('json', updateThreadInput), async (c) => {
		const authedUser = c.env.locals.user;
		if (!authedUser) throw new HTTPException(401);

		const { storedThreadUri } = c.req.param();
		const data = c.req.valid('json');

		await db.transaction(async (tx) => {
			const result = await tx
				.update(schema.threadRef)
				.set({
					prefetchBlobCids: data.prefetchBlobCids,
					blobDecryptionMap: Object.fromEntries(data.blobIds.map((blobId) => [blobId, null])),
					scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
					blobsUploadedAt: null // TODO: be smarter and avoid reuploading blobs that haven't changed
				})
				.where(
					and(
						eq(schema.threadRef.postAsDid, authedUser.id),
						eq(schema.threadRef.storedThreadUri, storedThreadUri)
					)
				);

			// TODO

			tx.rollback();
		});
	})
	.delete('/all', async (c) => {
		if (!dev) throw new HTTPException(404);

		if (!c.env.locals.user) throw new HTTPException(401);

		await db.delete(schema.threadRef).where(eq(schema.threadRef.postAsDid, c.env.locals.user.id));

		return c.json(null);
	})
	.delete('/:storedThreadUri', async (c) => {
		if (!c.env.locals.user) throw new HTTPException(401);

		const result = await db
			.delete(schema.threadRef)
			.where(
				and(
					eq(schema.threadRef.postAsDid, c.env.locals.user.id),
					eq(schema.threadRef.storedThreadUri, c.req.param('storedThreadUri'))
				)
			);

		if (result.rowsAffected === 0) throw new HTTPException(404);

		return c.json(null);
	});
