import { parse } from 'yaml';
import * as z from 'zod';
import raw from '../../config.yaml?raw';

const names = z.array(z.string().min(1)).min(1);
export const COLOURS = ['grey', 'pink', 'violet', 'red', 'orange', 'yellow', 'blue', 'amber', 'teal', 'green'] as const;

const schema = z.strictObject({
	spec_versions: names,
	table_versions: names.optional(),
	statuses: z
		.array(
			z.strictObject({
				name: z.string().min(1),
				colour: z.enum(COLOURS),
				solved: z.boolean(),
				description: z.string().default('')
			})
		)
		.min(1),
	user_classes: z
		.array(z.strictObject({ name: z.string().min(1), description: z.string().default('') }))
		.min(1)
});

/** The controlled vocabularies from `config.yaml`. Throws at startup if that file is malformed. */
export const config = schema
	.refine((c) => (c.table_versions ?? []).every((v) => c.spec_versions.includes(v)), {
		message: 'every table_versions entry must be in spec_versions'
	})
	.parse(parse(raw));
