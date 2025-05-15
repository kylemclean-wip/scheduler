import { Hono } from 'hono';
import { threadsRoutes } from './threads';
import { userRoutes } from './user';
import { oAuthRoutes } from './oauth';
import { internalRoutes } from './internal';

type Bindings = {
	locals: App.Locals;
};
type Variables = object;
export type HonoType = { Bindings: Bindings; Variables: Variables };

export const api = new Hono<HonoType>()
	.basePath('/api')
	.route('/threads', threadsRoutes)
	.route('/user', userRoutes)
	.route('/oauth/bsky', oAuthRoutes)
	.route('/internal', internalRoutes);

export type ApiType = typeof api;
