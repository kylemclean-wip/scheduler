export function clientLoginUrl(next?: string) {
	if (!next) {
		const currentUrl = new URL(window.location.href);
		next = encodeURIComponent(currentUrl.pathname + currentUrl.search);
	}

	return `/dashboard/client-login?next=${next}`;
}
