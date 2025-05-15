function requestIdleCallback(f: () => void) {
	if ('requestIdleCallback' in window) return window.requestIdleCallback(f);

	return setTimeout(f, 0);
}

function cancelIdleCallback(id: number) {
	if ('cancelIdleCallback' in window) return window.cancelIdleCallback(id);

	return clearTimeout(id);
}

export function onIdleRunner<T extends (...args: any[]) => any>(f: T) {
	let idleId: number | undefined = undefined;
	let delayId: ReturnType<typeof setTimeout> | undefined = undefined;

	function registerIdleCallback(...args: Parameters<T>) {
		requestIdleCallback(() => {
			f(...args);
			idleId = undefined;
		});
	}

	function registerDelayCallback(delay: number, ...args: Parameters<T>) {
		delayId = setTimeout(() => {
			f(...args);
			delayId = undefined;
		}, delay);
	}

	return function (delay: number, ...args: Parameters<T>) {
		if (idleId !== undefined) cancelIdleCallback(idleId);
		if (delayId !== undefined) clearTimeout(delayId);

		if (delay === 0) registerIdleCallback(...args);
		else registerDelayCallback(delay, ...args);
	};
}
