import { browser, dev } from '$app/environment';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';
import { clientClientMetadata } from './oauth-metadata';

const client = browser
	? new BrowserOAuthClient({
			clientMetadata: clientClientMetadata,
			handleResolver: 'https://bsky.social'
		})
	: null;

export let state: { next: string } | null = null;

if (client) {
	try {
		const result = await client.init();
		state = result && 'state' in result && result.state ? JSON.parse(atob(result.state)) : null;
	} catch (e) {
		console.error(e);
	}
}

export async function logIn(handle: string, next = '/dashboard') {
	if (!client) throw new Error('No client');
	return client.signIn(handle, { state: btoa(JSON.stringify({ next })) });
}

let lastDid: string | undefined = undefined;

export async function tryRestoreSession(did: string) {
	if (!client) throw new Error('No client');
	try {
		lastDid = did;
		return await client.restore(did);
	} catch (e) {
		return null;
	}
}

if (client && dev) {
	//@ts-ignore
	window.logOutLocalSession = (did?: string) => {
		if (did === undefined) did = lastDid;
		if (did) client.revoke(did);
	};
}
