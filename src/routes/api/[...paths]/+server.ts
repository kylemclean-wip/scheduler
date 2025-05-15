import { api } from '@/lib/server/api/api';
import type { RequestHandler } from '@sveltejs/kit';

const requestHandler: RequestHandler = ({ request, locals }) => api.fetch(request, { locals });

export const GET = requestHandler;
export const POST = requestHandler;
export const PUT = requestHandler;
export const PATCH = requestHandler;
export const DELETE = requestHandler;
export const OPTIONS = requestHandler;
export const HEAD = requestHandler;
export const fallback = requestHandler;
