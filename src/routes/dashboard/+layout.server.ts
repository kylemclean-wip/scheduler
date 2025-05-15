import { redirect } from '@sveltejs/kit';

export async function load({ locals, url }) {
	if (!locals.user) redirect(307, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
}
