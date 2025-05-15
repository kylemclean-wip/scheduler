import { hc } from 'hono/client';
import { browser } from '$app/environment';
import type { ApiType } from './server/api/api';

class ApiError extends Error {
	response: Response;

	constructor(response: Response) {
		super('API Error: ' + response.status + ' ' + response.statusText);
		this.response = response;
	}
}

const origin = browser ? window.location.origin : '';
const clientCache = new Map<typeof globalThis.fetch, ReturnType<typeof hc<ApiType>>>();

export function getClient(fetch: typeof globalThis.fetch) {
	const cachedClient = clientCache.get(fetch);
	if (cachedClient) return cachedClient;

	const client = hc<ApiType>(`${origin}`, {
		fetch: async (...args: Parameters<typeof fetch>) => {
			const response = await fetch(...args);
			if (!response.ok) throw new ApiError(response);
			return response;
		}
	});
	clientCache.set(fetch, client);
	return client;
}
