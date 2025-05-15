export function requireNonNull<T>(data: T | undefined): asserts data is NonNullable<T> {
	if (data === undefined || data === null) throw new Error(`data is ${data}`);
}
