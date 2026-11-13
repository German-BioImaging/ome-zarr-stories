<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		LABELS,
		MOSCOW,
		SCORES,
		SPEC_VERSIONS,
		STATUSES,
		USER_CLASSES,
		statusColumn,
		type Cells,
		type FieldErrors,
		type Story
	} from '#lib/schema.ts';
	import RelatedPicker from './RelatedPicker.svelte';

	let {
		values,
		errors = {},
		stories,
		cancelHref,
		submitLabel
	}: {
		values: Cells;
		errors?: FieldErrors;
		stories: Story[];
		cancelHref: string;
		submitLabel: string;
	} = $props();

	const items = (cell: string) => cell.split(';').map((item) => item.trim()).filter(Boolean);
	const requesters = $derived([...new Set(stories.flatMap((s) => s.requested_by))].sort());
	let saving = $state(false);
</script>

{#snippet field(column: string, hint = '')}
	<span class="label">{LABELS[column]}{#if hint}<small>&ensp;{hint}</small>{/if}</span>
	{#if errors[column]}<span class="error" id="{column}-error">{errors[column]}</span>{/if}
{/snippet}

<!-- Ctrl+Enter saves from any field, including the multi-line ones. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form
	method="POST"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
	onkeydown={(e) => {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) e.currentTarget.requestSubmit();
	}}
>
	{#if Object.keys(errors).length}
		<p class="error" role="alert">Not saved. Please fix the highlighted fields.</p>
	{/if}

	<label class="wide">
		{@render field('title')}
		<!-- svelte-ignore a11y_autofocus -->
		<input name="title" value={values.title} required autofocus aria-invalid={!!errors.title} />
	</label>

	<label class="wide">
		{@render field('statement', 'As a…, I want…, so that… Line breaks are kept.')}
		<textarea name="statement" rows="8" required aria-invalid={!!errors.statement}
			>{values.statement}</textarea
		>
	</label>

	<fieldset class="wide">
		<legend>{@render field('user_classes')}</legend>
		<div class="checks">
			{#each USER_CLASSES as userClass (userClass.name)}
				<label title={userClass.description}>
					<input
						type="checkbox"
						name="user_classes"
						value={userClass.name}
						checked={items(values.user_classes).includes(userClass.name)}
					/>
					{userClass.name}
				</label>
			{/each}
		</div>
	</fieldset>

	<label>
		{@render field('moscow')}
		<select name="moscow" value={values.moscow}>
			<option value="">Not prioritized</option>
			{#each MOSCOW as option (option)}<option>{option}</option>{/each}
		</select>
	</label>
	<label>
		{@render field('value', '1 low to 5 high')}
		<select name="value" value={values.value}>
			<option value="">–</option>
			{#each SCORES as option (option)}<option>{option}</option>{/each}
		</select>
	</label>
	<label>
		{@render field('effort', '1 low to 5 high')}
		<select name="effort" value={values.effort}>
			<option value="">–</option>
			{#each SCORES as option (option)}<option>{option}</option>{/each}
		</select>
	</label>

	{#each SPEC_VERSIONS as version (version)}
		<label>
			{@render field(statusColumn(version))}
			<select name={statusColumn(version)} value={values[statusColumn(version)]}>
				{#each STATUSES as option (option)}<option>{option}</option>{/each}
			</select>
		</label>
	{/each}
	<label>
		{@render field('rfcs', 'separate with ;')}
		<input name="rfcs" value={values.rfcs} placeholder="RFC-5; RFC-7" aria-invalid={!!errors.rfcs} />
	</label>

	<label class="wide">
		{@render field('workaround', 'how it is, or could be, done today')}
		<textarea name="workaround" rows="2">{values.workaround}</textarea>
	</label>

	<label class="wide">
		{@render field('notes', 'why each status was given, open questions. Line breaks are kept.')}
		<textarea name="notes" rows="4">{values.notes}</textarea>
	</label>

	<label>
		{@render field('requested_by', 'separate with ;')}
		<input name="requested_by" value={values.requested_by} list="requesters" />
		<datalist id="requesters">
			{#each requesters as name (name)}<option value={name}></option>{/each}
		</datalist>
	</label>
	<label>
		{@render field('reviewed')}
		<input type="date" name="reviewed" value={values.reviewed} aria-invalid={!!errors.reviewed} />
	</label>
	<label>
		{@render field('origin', 'where it was posted')}
		<input type="url" name="origin" value={values.origin} placeholder="https://…" aria-invalid={!!errors.origin} />
	</label>

	<label class="wide">
		{@render field('sources', 'one per line: a link, optionally followed by a note')}
		<textarea name="sources" rows="2">{items(values.sources).join('\n')}</textarea>
	</label>
	<label class="wide">
		{@render field('examples', 'one per line')}
		<textarea name="examples" rows="2">{items(values.examples).join('\n')}</textarea>
	</label>

	<div class="wide related">
		{@render field('related')}
		<RelatedPicker value={values.related} {stories} self={values.id} />
	</div>

	<footer class="wide">
		<a class="button" href={cancelHref}>Cancel</a>
		<button class="button primary" disabled={saving} title="Ctrl+Enter">{submitLabel}</button>
	</footer>
</form>

<style>
	form {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px 16px;
	}
	label,
	.related {
		display: grid;
		gap: 4px;
		align-content: start;
	}
	.wide {
		grid-column: 1 / -1;
	}
	.label {
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
	}
	small {
		font-weight: 400;
	}
	input:not([type='checkbox']),
	select,
	textarea {
		width: 100%;
	}
	textarea {
		resize: vertical;
	}
	[aria-invalid='true'] {
		border-color: var(--danger);
	}
	.error {
		color: var(--danger);
		font-size: 12px;
		margin: 0;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
	}
	legend {
		padding: 0;
		margin-bottom: 4px;
	}
	.checks {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 18px;
	}
	.checks label {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
	}
	footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding-top: 8px;
		border-top: 1px solid var(--line);
	}
	@media (max-width: 640px) {
		form {
			grid-template-columns: 1fr;
		}
	}
</style>
