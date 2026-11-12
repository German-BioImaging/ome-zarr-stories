import { parse } from 'yaml';
import * as z from 'zod';
import raw from '../../config.yaml?raw';

const names = z.array(z.string().min(1)).min(1);

const schema = z.strictObject({
	spec_versions: names,
	statuses: names,
	user_classes: z
		.array(z.strictObject({ name: z.string().min(1), description: z.string().default('') }))
		.min(1)
});

/** The controlled vocabularies from `config.yaml`. Throws at startup if that file is malformed. */
export const config = schema.parse(parse(raw));
