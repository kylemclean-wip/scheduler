import { Hono } from 'hono';
import { deleteCookie } from 'hono/cookie';
import type { HonoType } from './api';

export const userRoutes = new Hono<HonoType>().post('/logout', async (c) => {
	deleteCookie(c, 'accessToken');
	deleteCookie(c, 'refreshToken');
	return c.redirect('/', 302);
});
