export interface Author {
	handle: string;
	avatarSrc: string | undefined;
}

export function authorFromProfile(profile: { handle: string; avatar?: string }): Author {
	return {
		handle: profile.handle,
		avatarSrc: profile.avatar
	};
}
