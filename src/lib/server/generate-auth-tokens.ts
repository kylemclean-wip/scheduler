import { SignJWT } from 'jose';
import { setCookie } from 'hono/cookie';
import type { Context } from 'hono';
import type { HonoType } from './api/api';
import { authJwtKey } from './auth-jwt';
import type { Cookies } from '@sveltejs/kit';

export async function generateAndSetAuthTokens(
	did: string,
	cookieHolder: { type: 'hono'; holder: Context<HonoType> } | { type: 'sveltekit'; holder: Cookies }
) {
	const accessToken = await new SignJWT()
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(did)
		.setIssuedAt()
		.setExpirationTime('15 minutes')
		.sign(authJwtKey);

	const refreshToken = await new SignJWT()
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(did)
		.setIssuedAt()
		.setExpirationTime('1 year')
		.sign(authJwtKey);

	if (cookieHolder.type === 'hono') {
		setCookie(cookieHolder.holder, 'accessToken', accessToken);
		setCookie(cookieHolder.holder, 'refreshToken', refreshToken);
	} else {
		cookieHolder.holder.set('accessToken', accessToken, { path: '/' });
		cookieHolder.holder.set('refreshToken', refreshToken, { path: '/' });
	}
}
