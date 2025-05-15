export async function load({ locals }) {
	return { loggedInUser: locals.user ? { id: locals.user.id } : undefined };
}
