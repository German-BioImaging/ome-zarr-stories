# Fat

What could be taken out to keep the app lean. Each item says what it costs to keep and what would be lost. Nothing here is removed yet.

## Likely cuts

1. **Prioritization (Priority / Value / Effort / Score and the Board).** Hidden from Stories, the story page and the public site; only the local Board uses it. The arena now gives a ranking from votes instead. If the arena ranking is enough, drop the Board, `ScoreSelect.svelte`, `score()` and the three columns (or keep the columns in the TSV and drop only the UI).
2. **One-off triage files in the repo root.** `issue-triage.tsv`, `issue-triage-ome-zarr-ideas.tsv`, `issue-triage.md` and the untracked `issues.json` were inputs for mining stories. Their result is in `user-stories.tsv` (`origin`, `sources`). Move them to a `notes/` folder or drop them.
3. **`POTENTIAL_STORIES.md`.** Useful as a backlog, but it duplicates what GitHub issues do. Turn each item into an issue and delete the file.
4. **Map view and `similarity.ts` (~360 lines with page and tests).** Nice to look at, but it's the biggest single feature after the table. Keep it only if people use it to find overlaps (or reuse it for the duplicate check in NEXT-FEATURES #8).

## Smaller trims

5. **Progress view.** Overlaps with the status chips on Stories (which already show counts per version). Could become a small summary at the top of Stories.
6. **`Original:` paragraphs.** 46 stories carry both a rewritten short version and the original text. Once the short versions are reviewed, the originals could move to `notes` or be shortened.
7. **`zod` + `config.yaml`.** Two layers (YAML vocabularies validated by zod) for a handful of lists. Fine while vocabularies change; if they settle, a plain TS constant would do.
8. **Refresh on window focus** (`+layout.svelte`). Re-reads data every time the tab gets focus, to catch edits made outside the app. Rarely needed; a reload does the same.
9. **Two adapters.** The static build and the local server share code through `__STATIC__` checks in many files. If editing moved to PRs only, the local server (and adapter-node, the API routes, the edit forms) could go. That's a big cut; only worth it if nobody edits through the app.
