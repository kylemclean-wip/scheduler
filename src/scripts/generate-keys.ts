export {};

async function generateBskyOauthJwk() {
	const key = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
		'sign'
	]);
	const { kty, alg, crv, x, y, d } = await crypto.subtle.exportKey('jwk', key.privateKey);

	return {
		kty,
		alg,
		crv,
		x,
		y,
		d,
		use: 'sig',
		kid: String(Date.now())
	};
}

async function generateAuthJwt() {
	const key = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, true, [
		'sign',
		'verify'
	]);

	return await crypto.subtle.exportKey('jwk', key);
}

console.log(`SCHEDULER_PK1='${JSON.stringify(await generateBskyOauthJwk())}'`);
console.log(`SCHEDULER_PK2='${JSON.stringify(await generateBskyOauthJwk())}'`);
console.log(`SCHEDULER_AUTH_JWT='${JSON.stringify(await generateAuthJwt())}'`);
