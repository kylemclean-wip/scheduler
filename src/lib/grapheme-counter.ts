import { UnicodeString } from '@atproto/api';

export function getRemainingGraphemes(text: string, maxGraphemes: number) {
	return maxGraphemes - new UnicodeString(text).graphemeLength;
}
