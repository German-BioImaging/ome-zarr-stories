# Issue triage strategy (ome/ngff → user stories)

Goal: mine ome/ngff issues for **user stories about the spec**. Docs, website, tooling lists, CI, governance and editorial fixes are out of scope.

## Source
```
gh issue list -R ome/ngff --state all --limit 1000 --json number,title,body,labels,comments,state > issues.json
```

## Pipeline (single session, no subagents)
1. **Pre-sort (no LLM):** skip issues already cited in `user-stories.tsv` (any `ngff/issues/N` URL).
2. **Title triage:** given only issue titles and story `id + title`, give each issue one verdict. Saved to `issue-triage.tsv`.
3. **Deep pass, in chunks of ~10 to 20:** read the body and comments of the `candidate` and `update:` issues, then draft new rows or edits to existing ones. Each chunk is reviewed via `git diff`.

## Verdicts (`issue-triage.tsv`)
| verdict | meaning |
|---|---|
| `candidate` | may hold a new spec user story |
| `update:STORY-xxx` | likely adds a source, need or nuance to an existing story |
| `no-story` | not a user story; `reason` says why |
| `new:STORY-xxx` | after deep pass: origin/source of a new story |

`no-story` reasons:
- `docs-website`: documentation, website, tool or data listings
- `process-governance`: RFC process, versioning, authorship, CI/build, repo housekeeping
- `schema-validation`: JSON schema, examples, validators
- `spec-clarification`: wording or consistency fixes to existing spec text, with no new user need

Title triage is coarse. Reason tags come from keywords, and the verdicts come from a judgement on the title. A `no-story` may be reopened if the deep pass shows otherwise.

## New rows
- next free `STORY-NNN`
- `origin` = issue URL
- `requested_by` = issue author
- statuses `Unassessed`
- `reviewed` left empty

## Gap check (2026-11-13)
- All 294 issues are either triaged or cited. That matches GitHub's issue count.
- Comments in the user-story collection threads #649, #173, #84 and #650 were read in full. The relevant ones were added as comment-level sources; the rest are meta or design discussion.
- Long threads #580, #31, #33, #28, #208 and #104 were skimmed using keywords ("use case", "I want", "as a …"). Use-case comments were added as sources to existing stories.
- Not crawled: GitHub Discussions, PRs, and ome/ngff-spec issues.

## ome-zarr-ideas (2026-11-16)
Same protocol, applied to german-BioImaging/ome-zarr-ideas (143 issues) and saved to `issue-triage-ome-zarr-ideas.tsv`. Most issues are outreach, datasets or tooling ideas. About 20 spec-related issues were read in full: 8 became new stories (STORY-114..121), and 12 were added as sources to existing stories. Extra `no-story` reasons: `dataset-conversion`, `docs-outreach-process`, `tooling-infra`.
