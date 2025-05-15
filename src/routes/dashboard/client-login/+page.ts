import { tryRestoreSession, state } from '$lib/client-bsky-oauth';
import { redirect } from '@sveltejs/kit';

export const ssr = false;

export async function load({ parent }) {
	const { loggedInUser } = await parent();
	if (!loggedInUser) return;

	const session = await tryRestoreSession(loggedInUser.id);
	if (session) redirect(307, state?.next || '/dashboard');
}
