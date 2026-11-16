declare global {
	/** True in the read-only static build (STATIC=1), see vite.config.ts. */
	const __STATIC__: boolean;

	namespace App {
		interface Error {
			/** Line-by-line problems when user-stories.tsv is not valid. */
			issues?: string[];
		}
	}
}

export {};
