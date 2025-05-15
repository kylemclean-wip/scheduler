import type { OAuthClientMetadataInput } from '@atproto/oauth-client-browser';
import * as config from './config';

export const baseClientMetadata: Partial<OAuthClientMetadataInput> = {
	client_name: config.appName,
	client_uri: config.appUrl,
	logo_uri: `${config.appUrl}/favicon.png`,
	tos_uri: `${config.appUrl}/terms`,
	policy_uri: `${config.appUrl}/privacy`,
	grant_types: ['authorization_code', 'refresh_token'],
	response_types: ['code'],
	application_type: 'web',
	dpop_bound_access_tokens: true,
	scope: 'atproto transition:generic'
};

export const clientClientMetadata = {
	...baseClientMetadata,
	client_id: `${config.appUrl}/api/oauth/bsky/client-metadata.json?client=1`,
	redirect_uris: [`${config.appUrl}/dashboard/client-login`],
	token_endpoint_auth_method: 'none'
} satisfies OAuthClientMetadataInput;

export const serverClientMetadata = {
	...baseClientMetadata,
	client_id: `${config.appUrl}/api/oauth/bsky/client-metadata.json`,
	redirect_uris: [`${config.appUrl}/api/oauth/bsky/callback`],
	jwks_uri: `${config.appUrl}/api/oauth/bsky/jwks.json`,
	token_endpoint_auth_method: 'private_key_jwt',
	token_endpoint_auth_signing_alg: 'ES256'
} satisfies OAuthClientMetadataInput;
