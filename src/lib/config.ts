import * as v from 'valibot';
import * as rawEnv from '$env/static/public';

const env = v.parse(
	v.object({
		PUBLIC_SCHEDULER_APP_URL: v.optional(v.string(), 'http://localhost:5173'),
		PUBLIC_SCHEDULER_APP_NAME: v.optional(v.string(), 'Scheduler'),
		PUBLIC_SCHEDULER_TENOR_KEY: v.optional(v.string(), '')
	}),
	rawEnv
);

export const appUrl = env.PUBLIC_SCHEDULER_APP_URL;
export const appName = env.PUBLIC_SCHEDULER_APP_NAME;
export const tenorKey = env.PUBLIC_SCHEDULER_TENOR_KEY;
