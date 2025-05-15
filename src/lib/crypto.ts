const ivLength = 12;
const tagLength = 128;

const magic = new TextEncoder().encode('SBED');

export async function encryptData(data: Uint8Array, key: CryptoKey) {
	const iv = crypto.getRandomValues(new Uint8Array(ivLength));
	const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength }, key, data);

	const meta = new Uint8Array([0]);

	const result = new Uint8Array(
		magic.byteLength + meta.byteLength + iv.byteLength + encryptedData.byteLength
	);
	result.set(magic, 0);
	result.set(meta, magic.byteLength);
	result.set(iv, magic.byteLength + meta.byteLength);
	result.set(new Uint8Array(encryptedData), magic.byteLength + meta.byteLength + iv.byteLength);

	return result;
}

export async function decryptData(payload: Uint8Array, key: CryptoKey) {
	for (let i = 0; i < magic.length; i++) {
		if (payload[i] !== magic[i]) {
			throw new Error('Invalid magic');
		}
	}

	const meta = payload[magic.length];
	if (meta !== 0) {
		throw new Error('Invalid meta');
	}

	const iv = payload.slice(magic.length + 1, magic.length + 1 + ivLength);
	const encryptedData = payload.slice(magic.length + 1 + ivLength);

	const decryptedData = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv, tagLength },
		key,
		encryptedData
	);

	return decryptedData;
}

export async function encryptJson(json: unknown, key: CryptoKey) {
	const data = new TextEncoder().encode(JSON.stringify(json));
	return encryptData(data, key);
}

export async function decryptJson(payload: Uint8Array, key: CryptoKey) {
	return decryptData(payload, key).then(
		(data) => JSON.parse(new TextDecoder().decode(data)) as unknown
	);
}

export async function generateEncryptionKey() {
	return await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
		'encrypt',
		'decrypt'
	]);
}

export async function exportJwk(key: CryptoKey) {
	return await crypto.subtle.exportKey('jwk', key);
}
