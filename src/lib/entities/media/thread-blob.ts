import * as v from 'valibot';
import { Agent } from '@atproto/api';
import type { StoredThreadBlob } from '@/lib/bsky-store';
import { decryptData } from '@/lib/crypto';

const threadBlobClassIdentifier = crypto.randomUUID();

export class ThreadBlob {
	private readonly gggg = threadBlobClassIdentifier;
	public readonly id: string;
	public dataSource?:
		| { type: 'local'; blob: Blob }
		| {
				type: 'remoteEncrypted';
				storedThreadBlob: StoredThreadBlob;
				key: CryptoKey;
		  }
		| {
				type: 'remoteUnencrypted';
				unencryptedBlob: {
					did: string;
					blobRef: { ref: { $link: string }; mimeType: string };
				};
		  };

	#url?: Promise<string>;

	constructor(id: string, localBlob?: Blob) {
		this.id = id;

		if (localBlob) this.dataSource = { type: 'local', blob: localBlob };
	}

	get url() {
		if (!this.#url) {
			this.#url = this.createBlobPromise().then((blob) => {
				const objectUrl = URL.createObjectURL(blob);
				registry.register(this, { objectUrl });
				return objectUrl;
			});
		}
		return this.#url;
	}

	get meta() {
		if (!this.dataSource) throw new Error('No data source');

		if (this.dataSource.type === 'local') return { mimeType: this.dataSource.blob.type };

		if (this.dataSource.type === 'remoteEncrypted') return this.dataSource.storedThreadBlob.meta;

		if (this.dataSource.type === 'remoteUnencrypted')
			return { mimeType: this.dataSource.unencryptedBlob.blobRef.mimeType };

		throw new Error('Unknown data source type');
	}

	private async createBlobPromise() {
		if (!this.dataSource) throw new Error('No data source');

		if (this.dataSource.type === 'local') return Promise.resolve(this.dataSource.blob);

		const agent = new Agent('https://bsky.social');

		if (this.dataSource.type === 'remoteEncrypted') {
			return fetchAndDecryptBlob(
				{
					cid: this.dataSource.storedThreadBlob.blobRef.ref.$link,
					did: this.dataSource.storedThreadBlob.did,
					mimeType: this.meta.mimeType
				},
				this.dataSource.key,
				agent
			);
		}

		if (this.dataSource.type === 'remoteUnencrypted') {
			const response = await agent.com.atproto.sync.getBlob({
				did: this.dataSource.unencryptedBlob.did,
				cid: this.dataSource.unencryptedBlob.blobRef.ref.$link
			});
			if (!response.success) throw new Error('Failed to fetch unencrypted blob');
			return new Blob([response.data], { type: this.meta.mimeType });
		}

		throw new Error('Unknown data source type');
	}
}

export const threadBlobSchema = v.union([
	v.pipe(
		v.custom((data) =>
			typeof data === 'object' && data && 'gggg' in data && data.gggg === threadBlobClassIdentifier
				? true
				: false
		),
		v.transform((data) => data as ThreadBlob)
	),
	v.pipe(
		v.object({ id: v.string() }),
		v.transform((data) => new ThreadBlob(data.id))
	)
]);

export async function fetchAndDecryptBlob(
	{ cid, did, mimeType }: { cid: string; did: string; mimeType: string },
	key: CryptoKey,
	agent: Agent
) {
	const encryptedBlobResponse = await agent.com.atproto.sync.getBlob({ did, cid });
	if (!encryptedBlobResponse.success) throw new Error('Failed to fetch encrypted blob');

	const decryptedBlobData = await decryptData(encryptedBlobResponse.data, key);
	const decryptedBlob = new Blob([decryptedBlobData], {
		type: mimeType
	});
	return decryptedBlob;
}

const registry = new FinalizationRegistry(({ objectUrl }: { objectUrl: string }) => {
	URL.revokeObjectURL(objectUrl);
});
