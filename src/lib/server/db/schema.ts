import { sql } from 'drizzle-orm';
import { index, text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	did: text('did').primaryKey(),
	email: text('email'),
	emailVerifiedAt: integer('emailVerifiedAt', { mode: 'timestamp' }),
	bskyDpopJwk: text('bskyDpopJwk'),
	bskyTokenSet: text('bskyTokenSet'),
	joinedAt: integer('joinedAt', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const threadRef = sqliteTable(
	'threadRef',
	{
		storedThreadUri: text('storedThreadUri').notNull().primaryKey(),
		storedThreadKey: text('storedThreadKey').notNull(),
		storedAt: integer('storedAt', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		postAsDid: text('postAsDid')
			.notNull()
			.references(() => user.did, { onDelete: 'cascade' }),
		prefetchBlobCids: text('prefetchBlobCids', { mode: 'json' }).$type<string[]>().notNull(),
		blobDecryptionMap: text('blobDecryptionMap', { mode: 'json' })
			.$type<Record<string, { cid: string } | { jobId: string } | null>>()
			.notNull(),
		blobUploadOrPostAttemptedAt: integer('blobUploadOrPostAttemptedAt', { mode: 'timestamp' }),
		blobsUploadedAt: integer('blobsUploadedAt', { mode: 'timestamp' }),
		scheduledFor: integer('scheduledFor', { mode: 'timestamp' }),
		postedAt: integer('postedAt', { mode: 'timestamp' }),
		firstPostUri: text('firstPostUri')
	},
	(table) => ({
		postAsDidIdx: index('postAsDidIdx').on(table.postAsDid),
		scheduledForIdx: index('scheduledForIdx').on(table.scheduledFor)
	})
);

export const oAuthLoginState = sqliteTable('oAuthLoginState', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
	createdAt: integer('createdAt', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});
