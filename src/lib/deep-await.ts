export type DeepAwaited<T> =
	T extends Promise<infer U>
		? DeepAwaited<U>
		: T extends object
			? { [K in keyof T]: DeepAwaited<T[K]> }
			: T;

export async function deepAwait<T>(obj: T): Promise<DeepAwaited<T>> {
	// Handle primitive values and non-object types
	if (obj === null || typeof obj !== 'object') {
		return obj as DeepAwaited<T>;
	}

	// If it's a promise, await it and recursively deep await
	if (obj instanceof Promise) {
		return deepAwait(await obj);
	}

	// Handle arrays
	if (Array.isArray(obj)) {
		return Promise.all(obj.map(deepAwait)) as DeepAwaited<T>;
	}

	// Handle objects
	if (obj instanceof Object) {
		const result: any = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = await deepAwait(value);
		}
		return result;
	}

	return obj as DeepAwaited<T>;
}
