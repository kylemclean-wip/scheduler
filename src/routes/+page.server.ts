import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	if (locals.user) return redirect(307, '/dashboard');
}
