# Next features

Ideas for what the app could do next, roughly in order of value for effort. None is promised. Prune freely.

## Arena

1. **Collect public votes without a PR.** Votes from the public demo now go through a download and a PR or issue. A GitHub issue form with a "paste your votes" field, plus a small Action that appends valid rows to `arena-matches.tsv`, would remove the manual merge.
2. **Rank ties and "both matter".** Add an "equally" choice that records a draw (Elo handles 0.5 scores). Today it can only be skipped.
3. **Ranking with uncertainty.** Show how settled each rating is (e.g. games played, or a simple confidence band), so a story with 2 games isn't read like one with 40.
4. **Who voted.** An optional voter name (or role/user class of the voter) on each vote, so rankings can be split by community, not only by story class.

## Stories

5. **Short version as its own column.** The short/long split is a convention (first paragraph of `statement`). A `summary` column would make it explicit, editable in the form, and checkable by the tests.
6. **Lint for story shape.** A test (or form hint) that flags statements whose first paragraph isn't "As a…, I want…, so that…" or is over ~300 characters.
7. **Promote potential stories.** A button or script that turns an item of `POTENTIAL_STORIES.md` into a draft `STORY-NNN`.
8. **Duplicate check on create.** Use the existing similarity code (Map) to warn "this looks like STORY-042" when adding a story.

## Sharing

9. **Per-story discussion link.** A "Discuss" link that opens a prefilled GitHub issue or image.sc thread for the story.
10. **Export.** One-click CSV/JSON of the filtered table, for slides and RFC write-ups.
11. **RFC view.** A page per RFC listing the stories it addresses and their status before and after, useful when reviewing an RFC.
