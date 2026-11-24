# OME-Zarr user stories

A small local app for collecting, reviewing and prioritizing user stories for OME-Zarr.

The stories live in [`user-stories.tsv`](user-stories.tsv), one per line. That file is the only
copy: the app reads and writes it directly, so every change is a one-line git diff and the file can
still be edited by hand or through pull requests.

## Run it

Needs Node 22 or newer.

```sh
npm install     # once
npm run dev     # then open http://localhost:5173
```

- **Stories** is the table: search, filter, sort, and set statuses and RFCs in place.
- **Board** (local only) shows the stories by priority; drag a card to another column to re-prioritize. Priority, value and effort live only here and in the TSV.
- **Arena** shows two stories at a time; pick the one you prefer to build an Elo ranking (see below).
- **Map** places similar stories close together, coloured by their status in a chosen version.
- **Progress** shows, per spec version, the share of stories at each status; click a segment to list them.
- Click a title for the full story, where you can edit or delete it.

Filters and sorting are kept in the address bar, so a view can be bookmarked or shared.

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Checks that `user-stories.tsv` is valid, and runs the tests of the data layer |
| `npm run check` | Type-checks the code |
| `npm run build && npm start` | Runs the built app instead of the development server |

## Story arena

`/arena` shows two stories; pick the one you prefer, or skip. Each vote is appended to `arena-matches.tsv` (`winner, loser, at, class`; override with `ARENA_FILE`), and Elo ratings (K=32, start 1500) are replayed from that log. Pairing follows bhl-arena: mostly least-played stories, sometimes top-vs-top or top-vs-underdog. Votes made with a user-class or RFC filter (the **Ranking** menu) feed that class's or RFC's own ranking, comparing only stories tagged with it; votes without one feed the overall ranking. RFC votes store the RFC (e.g. `RFC-5`) in the `class` column. Cards show a story's short version (the first paragraph of `statement`); the rest is under "Full story". Locally, votes go straight into `arena-matches.tsv`; on the public site the arena is a demo (see below).

### Voting in the arena

The arena on the public site ranks stories from the votes in [`arena-matches.tsv`](arena-matches.tsv). Votes you make there are saved only in your browser. To add them to the public ranking:

1. Vote at <https://german-bioimaging.github.io/ome-zarr-stories/arena>. Use the filters to vote within one user class; those votes feed that class's ranking.
2. Click **Download my votes**. You get `my-arena-votes.tsv`, one vote per line: `winner, loser, time, class`.
3. Send them in, either way:
   - **Pull request:** append the lines to the end of `arena-matches.tsv` (no header) and open a PR.
   - **Issue:** [open an issue](https://github.com/German-BioImaging/ome-zarr-stories/issues/new?title=Arena%20votes) and attach or paste the file.
4. Once merged, the public ranking includes your votes. Click **Clear** in the arena to start a new batch.

Votes are anonymous apart from your GitHub account on the PR or issue. Maintainers may drop votes that look automated.

## Read-only site (GitHub Pages)

`npm run build:static` builds a browse-only copy into `build/`: the same views, with no adding, editing
or deleting, and without prioritization
(priority, value, effort, score and the Board view), which is internal. Set `BASE_PATH` when it is served from a subfolder, e.g.
`BASE_PATH=/ngff-stories npm run build:static`.

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) publishes it on every push to `main`. To
turn it on once, choose Settings → Pages → Source: "GitHub Actions" in the repository.

## The data

`user-stories.tsv` is tab-separated with a header row and these columns, in this order:

| Column | Meaning | Allowed values |
|---|---|---|
| `id` | Identifier, never reused | `STORY-001`, `STORY-002`, … |
| `title` | Short name | Required |
| `statement` | The story itself, ideally "As a…, I want…, so that…" | Required |
| `user_classes` | Who the story is for | List of the user classes in `config.yaml` |
| `requested_by` | Who asked for it | List of names or GitHub handles |
| `moscow` | Priority | `Must`, `Should`, `Could`, `Won't`, or blank |
| `value` | How much it matters | `1` (low) to `5` (high), or blank |
| `effort` | How hard it is | `1` (low) to `5` (high), or blank |
| `status_<version>` | Whether that OME-Zarr version supports it; one column per version in `config.yaml` | One of the statuses in `config.yaml` |
| `workaround` | How it is, or could be, done today | Free text |
| `notes` | Why each status was given, open questions; one line per version, e.g. `0.6: …` | Free text, line breaks kept |
| `rfcs` | RFCs that address it | List of `RFC-5`, `RFC-7`, … |
| `related` | Linked stories; a link is stored on one story and shown on both | List of existing story IDs |
| `origin` | Where the story was posted | One `http(s)` link, or blank |
| `sources` | Other issues and threads behind it | List of links, each optionally followed by a note |
| `examples` | Example data or papers | List of links, each optionally followed by a note |
| `reviewed` | When the story was last reviewed | Date as `2026-11-12`, or blank |

Rules for the file:

- **Lists** separate their items with `; `.
- **One story per line.** A line break inside a cell is written as `\n`, a tab as `\t` and a
  backslash as `\\`.
- **Score** (value ÷ effort) is shown in the app but not stored.

### Statuses

How well a spec version supports a story, from most to least supported:

| Status | Meaning |
|---|---|
| Core | Explicitly specified in the core spec |
| Core extension | Spec-maintained metadata outside the core: transitional metadata today (e.g. `omero`), official RFC-8 extensions later |
| Community extension | A published extension using the RFC-8 mechanism, maintained outside the spec; support varies by tool |
| Possible | General spec features express it as they are meant to be used, though nothing is dedicated to it |
| Awkward | The spec allows it only by bending features beyond their intent: dummy axes, splitting one image into several, encoding simple transforms as fields |
| Out of spec | Valid OME-Zarr only through custom attributes or side files; other tools won't understand it |
| Breaking | Cannot be done without violating the spec |
| Unsure | Looked at, but which level applies is unclear; needs discussion |
| Unassessed | Nobody has looked at it yet |

Core and Core extension count as solved, so "Hide solved" hides them. The list, colours and
descriptions live in `config.yaml`.

The app refuses to load a file that breaks these rules and lists the offending lines, and
`npm test` fails on it, so it can be used as a check in CI.

## Changing the vocabularies

[`config.yaml`](config.yaml) holds the lists the stories are checked against: the user classes,
the statuses (with the colour and meaning of each), and the OME-Zarr versions that have a status
column. Edit that file to add or rename
a value. Adding a version there means adding its `status_<version>` column to the TSV too. `table_versions` picks which
versions the dashboard shows as columns by default; the others appear when you pick them in the
status switch or the "Changed from … to …" filter.

## How the code is organized

| Path | What is there |
|---|---|
| `src/lib/schema.ts` | The definition of a story: columns, labels, validation |
| `src/lib/config.ts` | Reads and checks `config.yaml` |
| `src/lib/server/tsv.ts` | Parses and writes the file format |
| `src/lib/server/store.ts` | Reads the file and adds, changes and deletes stories |
| `src/lib/server/similarity.ts` | Lays out the map from the wording of the stories |
| `src/lib/components/` | Shared pieces of the interface |
| `src/routes/` | The pages: table, board, map, progress, story, edit, new |

Built with [SvelteKit](https://svelte.dev/docs/kit).
