import { Hono } from 'hono';
import type { HonoType } from './api';
import { serverOAuthClient } from '../server-bsky-oauth';
import { generateAndSetAuthTokens } from '../generate-auth-tokens';
import { clientClientMetadata, serverClientMetadata } from '@/lib/oauth-metadata';

export const oAuthRoutes = new Hono<HonoType>()
	.get('/callback', async (c) => {
		const { session, state } = await serverOAuthClient
			.callback(new URL(c.req.url).searchParams)
			.catch(() => ({
				session: undefined,
				state: undefined
			}));

		if (!session) {
			return c.redirect('/login?error=Access%20denied', 302);
		} else {
			await generateAndSetAuthTokens(session.did, { type: 'hono', holder: c });

			let redirectUrl = '/dashboard';

			if (state) {
				try {
					redirectUrl = JSON.parse(atob(state)).next || redirectUrl;
				} catch {
					// ignore
				}
			}

			return c.redirect(redirectUrl, 302);
		}
	})
	.get('/client-metadata.json', async (c) => {
		if (new URL(c.req.url).searchParams.get('client')) return c.json(clientClientMetadata);
		return c.json(serverClientMetadata);
	})
	.get('/jwks.json', async (c) => {
		return c.json(serverOAuthClient.jwks);
	});
