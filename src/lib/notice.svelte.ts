/** The small "Saved" / "Not saved" message in the header. */
export const notice = $state({ text: '', error: false });

let timer: ReturnType<typeof setTimeout>;

export function notify(text: string, error = false) {
	clearTimeout(timer);
	notice.text = text;
	notice.error = error;
	if (!error) timer = setTimeout(() => (notice.text = ''), 2500);
}
