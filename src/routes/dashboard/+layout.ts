import { tryRestoreSession } from '$lib/client-bsky-oauth';
import { Agent } from '@atproto/api';

export const ssr = false;

export async function load({ parent }) {
	const { loggedInUser } = await parent();
	if (!loggedInUser) return undefined;

	const publicAgent = new Agent('https://public.api.bsky.app');
	const session = await tryRestoreSession(loggedInUser.id);
	const profile = await publicAgent.app.bsky.actor
		.getProfile({ actor: loggedInUser.id })
		.then((response) => response.data);

	return {
		loggedInUser: {
			...loggedInUser,
			clientData: {
				session,
				profile,
				agent: session ? new Agent(session) : null
			}
		}
	};
}
