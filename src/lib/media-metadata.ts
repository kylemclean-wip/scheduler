import { ThreadBlob } from './entities/media/thread-blob';

export async function generateSizeAndThumbnailBlob(src: string, mimeType: string) {
	const canvas = document.createElement('canvas');

	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Failed to get canvas context');

	const { imageSource, width, height } = await getCanvasImageSource(src, mimeType);

	canvas.width = width;
	canvas.height = height;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);

	const thumbnailBlob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error('Failed to create thumbnail'));
					return;
				}
				resolve(blob);
			},
			'image/jpeg',
			0.8
		);
	});

	return {
		size: {
			width,
			height
		},
		thumbnailBlob: new ThreadBlob(crypto.randomUUID(), thumbnailBlob)
	};
}

export async function computeVideoSize(src: string, mimeType = 'video/*') {
	const { width, height } = await getCanvasImageSource(src, mimeType);
	return { width, height };
}

async function getCanvasImageSource(src: string, mimeType: string) {
	if (mimeType.startsWith('video/')) {
		const videoElement = document.createElement('video');
		videoElement.src = src;
		videoElement.load();

		await new Promise<void>((resolve) => {
			videoElement.addEventListener('loadeddata', () => resolve());
		});

		return {
			imageSource: videoElement,
			width: videoElement.videoWidth,
			height: videoElement.videoHeight
		};
	} else if (mimeType.startsWith('image/')) {
		const image = new Image();
		image.src = src;

		await new Promise<void>((resolve) => {
			image.onload = () => resolve();
		});

		return {
			imageSource: image,
			width: image.width,
			height: image.height
		};
	}

	throw new Error(`Unsupported media type ${mimeType}`);
}
