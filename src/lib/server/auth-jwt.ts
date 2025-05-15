import { importJWK } from 'jose';
import * as config from '$lib/server/server-config';

export const authJwtKey = await importJWK(JSON.parse(config.authJwt!));
