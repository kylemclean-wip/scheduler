import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { JoseKey } from '@atproto/jwk-jose';
import { eq } from 'drizzle-orm';
import * as serverConfig from '$lib/server/server-config';
import { db } from './db';
import * as schema from './db/schema';
import { serverClientMetadata } from '$lib/oauth-metadata';

export const serverOAuthClient = new NodeOAuthClient({
	clientMetadata: serverClientMetadata,

	keyset: await Promise.all([
		JoseKey.fromImportable(serverConfig.pk1),
		JoseKey.fromImportable(serverConfig.pk2)
	]),

	stateStore: {
		async get(key) {
			const state = await db.query.oAuthLoginState.findFirst({
				where: (state, { eq }) => eq(state.key, key)
			});
			if (!state) return undefined;

			try {
				return JSON.parse(state.value);
			} catch (e) {
				console.warn(`Failed to parse stored OAuth state JSON of key ${key}`, e);
				return undefined;
			}
		},

		async set(key, value) {
			await db
				.insert(schema.oAuthLoginState)
				.values({
					key,
					value: JSON.stringify(value)
				})
				.onConflictDoUpdate({
					target: schema.oAuthLoginState.key,
					set: { value: JSON.stringify(value) }
				});
		},

		async del(key) {
			await db.delete(schema.oAuthLoginState).where(eq(schema.oAuthLoginState.key, key));
		}
	},

	sessionStore: {
		async get(key) {
			const user = await db.query.user.findFirst({
				columns: { bskyDpopJwk: true, bskyTokenSet: true },
				where: (user, { eq }) => eq(user.did, key)
			});

			if (!user || !user.bskyDpopJwk || !user.bskyTokenSet) return undefined;

			try {
				return {
					dpopJwk: JSON.parse(user.bskyDpopJwk),
					tokenSet: JSON.parse(user.bskyTokenSet)
				};
			} catch (e) {
				console.warn(`Failed to parse stored dpopJwk or tokenSet JSON of user ${key}`, e);
				return undefined;
			}
		},

		async set(key, value) {
			const update = {
				bskyDpopJwk: JSON.stringify(value.dpopJwk),
				bskyTokenSet: JSON.stringify(value.tokenSet)
			};

			await db
				.insert(schema.user)
				.values({
					did: key,
					...update
				})
				.onConflictDoUpdate({ target: schema.user.did, set: update });
		},

		async del(key) {
			await db
				.update(schema.user)
				.set({ bskyDpopJwk: '', bskyTokenSet: '' })
				.where(eq(schema.user.did, key));
		}
	}
});
