import { fail, redirect, type Actions } from '@sveltejs/kit';
import { serverOAuthClient } from '$lib/server/server-bsky-oauth';
import { OAuthResolverError } from '@atproto/oauth-client-node';

export async function load({ locals }) {
	if (locals.user) redirect(307, '/');
}

export const actions: Actions = {
	default: async ({ request, url }) => {
		const data = await request.formData();
		const username = data.get('username');

		if (!username || typeof username !== 'string' || username.trim() === '.bsky.social')
			return fail(400, { error: 'Username is required' });

		const next = url.searchParams.get('next') || '/dashboard';

		const state = btoa(JSON.stringify({ next }));

		let authorizationUrl;
		try {
			authorizationUrl = await serverOAuthClient.authorize(username, { state });
		} catch (e) {
			if (e instanceof OAuthResolverError) {
				return fail(400, { error: e.message });
			}

			console.error(e);
			return fail(500, { error: 'Failed to get authorization URL' });
		}

		redirect(302, authorizationUrl);
	}
};
