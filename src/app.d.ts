declare global {
	namespace App {
		interface Error {
			/** Line-by-line problems when user-stories.tsv is not valid. */
			issues?: string[];
		}
	}
}

export {};
