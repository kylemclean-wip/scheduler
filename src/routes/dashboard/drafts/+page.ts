import { authorFromProfile } from '@/lib/author';
import { loadThreads } from '@/lib/thread-loader';

export async function load({ data, parent }) {
	const { loggedInUser } = await parent();
	if (!loggedInUser) throw new Error('Not logged in');

	return {
		threads: await loadThreads(data.threadRefs, authorFromProfile(loggedInUser.clientData.profile))
	};
}
