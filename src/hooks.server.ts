import { jwtVerify } from 'jose';
import { authJwtKey } from '$lib/server/auth-jwt';
import { generateAndSetAuthTokens } from '$lib/server/generate-auth-tokens';
import { serverOAuthClient } from '$lib/server/server-bsky-oauth';
import { internalAuthTokens } from './lib/server/server-config';
import { error } from '@sveltejs/kit';

export async function handle({ event, resolve }) {
	const authHeader = event.request.headers.get('Authorization');
	const authToken = authHeader?.replace('Bearer ', '');

	event.locals.internalAuth = !!(authToken && internalAuthTokens.includes(authToken));
	if (
		!event.locals.internalAuth &&
		new URL(event.request.url).pathname.startsWith('/api/internal/')
	) {
		error(401);
	}

	const accessToken = event.cookies.get('accessToken');
	const refreshToken = event.cookies.get('refreshToken');

	let userId = undefined;

	if (accessToken) {
		userId = await jwtVerify(accessToken, authJwtKey)
			.then((res) => res.payload.sub)
			.catch(() => undefined);
	}

	if (!userId && refreshToken) {
		userId = await jwtVerify(refreshToken, authJwtKey)
			.then((res) => res.payload.sub)
			.catch(() => undefined);

		if (userId) {
			try {
				await serverOAuthClient.restore(userId);
				await generateAndSetAuthTokens(userId, { type: 'sveltekit', holder: event.cookies });
			} catch {
				userId = undefined;
			}
		}
	}

	event.locals.user = userId ? { id: userId } : undefined;

	const response = await resolve(event);
	return response;
}
