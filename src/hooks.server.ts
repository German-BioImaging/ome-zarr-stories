import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { DataError } from '#lib/server/tsv.ts';

/** Only this app's own pages may change stories: other sites open in the browser are refused. */
export const handle: Handle = ({ event, resolve }) => {
	const origin = event.request.headers.get('origin');
	if (event.request.method !== 'GET' && origin && origin !== event.url.origin) {
		return new Response('Requests from other sites are not allowed', { status: 403 });
	}
	return resolve(event);
};

export const handleError: HandleServerError = ({ kind, error }) => {
	// 404s and errors raised on purpose with `error(...)` keep their own message.
	if (kind !== 'unknown') return;
	// A broken data file is reported line by line instead of a generic failure.
	if (error instanceof DataError) return { message: error.message, issues: error.issues };
	console.error(error);
	return { message: 'Something went wrong. See the terminal for details.' };
};
