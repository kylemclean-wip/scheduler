import * as env from '$env/static/private';

export const pk1 = env.SCHEDULER_PK1;
export const pk2 = env.SCHEDULER_PK2;
export const authJwt = env.SCHEDULER_AUTH_JWT;

export const internalAuthTokens = (env.SCHEDULER_INTERNAL_AUTH_TOKENS ?? '')
	.split(',')
	.filter(Boolean);
