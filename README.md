# lit-crm-seeds

The Benjamin Franklin demo dataset for [lit-crm](https://github.com/filips-alpe/lit-crm): 25,827 records from Founders Online and Wikidata, 17 of the people around him as users, 12 types, 23 projects, plus demo groups, grants, hidden records and amounts for lit-crm's permission model. It has three parts:

- `seed/`: the data pipeline (committed source snapshots, generator, generated records) and the loader.
- `extension/`: the `franklin` lit-crm extension, with a renderer for each type and a dashboard for each user.
- `bun run seed --db <url>`: writes the data straight into lit-crm's tables. It does not need lit-crm's Prisma client.

## Load the data into lit-crm

Requires [bun](https://bun.sh). In lit-crm, with Postgres running and the schema migrated:

```sh
cd ../lit-crm && bunx prisma migrate deploy

git clone https://github.com/filips-alpe/lit-crm-seeds ../lit-crm-seeds
cd ../lit-crm-seeds
bun install
bun run seed --db "postgresql://postgres:postgres@localhost:5433/lit_crm?schema=public"
```

> **This deletes every user, type, project and record** in the database it is pointed at (and every group, membership and grant, when the database has those tables), then loads 17 users, 12 types, 23 projects, 25,827 records and 26,118 project links, plus the permission demo below, in one transaction. `--db` is required: there is no default and no environment fallback, so it cannot hit a database by accident. Do not point it at a database that holds data you want to keep.

### The permission demo

lit-crm decides who sees which record in Postgres (row-level security, driven by grants stored as data; see lit-crm's README, "Permissions"). Without any grant, a user reads and writes the records they created or are assigned to, and every record of a project they created or are assigned to. Admins see everything. Grants add access to a user or a group, by scope (a person's records, a project, a type, or one record), at level `READ` or `WRITE`, optionally hiding amounts. A record flagged `hidden` is visible to admins only. The seeds ship a historically fitting set of each, as data files like `projects.yaml`:

| File                      | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `seed/data/user.yaml`     | 17 users. `bfranklin` has `isAdmin: true`.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `seed/data/projects.yaml` | All projects are created by `bfranklin`; five are assigned to fitting non-admin users (`theme-electricite` to `pcollinson`, `theme-hutchinson-letters` to `tcushing`, `periode-france-1776-1785` to `wtfranklin`, `theme-alliance-france` to `lafayette`, `theme-paix-1783` to `jadams`).                                                                                                                                                                                                              |
| `seed/data/groups.yaml`   | 4 groups and their members: `family`, `craven-street`, `natural-philosophy`, `passy-circle`.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `seed/data/grants.yaml`   | 7 grants: group on a project (`family` reads the Philadelphia years), a user on a person (`wtfranklin` writes on Franklin's papers, amounts hidden), group on a type with amounts hidden (`craven-street` reads the accounts), a user on one record (`phewson` may write her mother's bill: READ on every account, WRITE on one), group on a type (`natural-philosophy` reads the essays), user on a project (`lafayette` writes the alliance project), user on a type (`gsharp` reads the petitions). |
| `seed/data/hidden.yaml`   | Records matching a type and title pattern are `hidden`: the letters between Franklin and his loyalist son, 1775 on (4 records). Even their creator no longer sees them.                                                                                                                                                                                                                                                                                                                                |
| `seed/data/amounts.yaml`  | The generated import has no amounts, so every third `account` record gets a deterministic `sum` (and `total`), 54 records, so that masking shows in real data.                                                                                                                                                                                                                                                                                                                                         |

Targets and scopes are natural keys (usernames, group names, project and type codes; a record grant names `{type, title}` and must match exactly one record). An unknown key or an ambiguous record selector fails before anything is inserted.

Compatibility: the loader looks up the grant tables (`lit_group`, `lit_group_member`, `lit_grant`), `lit_record.hidden` and `lit_user.isAdmin` in `information_schema` and writes only what exists. Against a database migrated with an older lit-crm (before the grants or even the RLS migrations), it loads exactly the users, types, projects, records and links as before and prints that groups and grants were skipped (the amounts are still stored, they are an ordinary `lit_record` column). The loader connects as the table owner, so row-level security and lit-crm's guard triggers do not apply to it. Ids and `updatedAt` are set by the loader itself (lit-crm's Prisma schema generates them client-side).

Edit the YAML files to change the demo; `bun run test` checks the loader against both schema shapes.

## Install the extension

The renderers and dashboards are optional but give the data its look. From lit-crm:

```sh
bun run ext install ../lit-crm-seeds --path extension
# or: bun run ext install https://github.com/filips-alpe/lit-crm-seeds.git --path extension
```

`--path extension` is needed because the extension is in the `extension/` folder of this repo, not at its root. The installer copies it to `src/extensions/franklin` and merges its `messages/en.json` and `messages/lv.json` keys into lit-crm's `messages/`. `bun run ext uninstall franklin` reverses both. Restart the dev server afterwards. Extensions run as code in the app, so only install ones you trust.

## Tests

```sh
bun install
bun run test    # pipeline, classifier, types and loader tests (loader: with and without the grant tables)
bun run check   # tsc
bun run lint    # prettier
```

The extension's tests import lit-crm code (`$lib/...`), so they cannot run here. They are copied with the extension and run in lit-crm after install (`bunx vitest run` there). Two of them also read seed data from this repo: set `SEEDS_DIR` to a checkout of it (default `../lit-crm-seeds`) or they are skipped.

## Regenerate the data

The records are generated from snapshots committed in `seed/sources/`. Generation uses no network and gives the same output every time:

```sh
bun run generate                                  # snapshots -> seed/generated/ and seed/data/projects.yaml
bun seed/sources/extract-fo.ts <path>             # rebuild the Founders Online snapshot from the raw metadata dump
bun seed/sources/wikidata/fetch.ts                # refetch the Wikidata snapshot (network)
```

Types are defined in `seed/data/types.yaml`, users in `seed/data/user.yaml`. The generator assigns each record a type from its source data:

| Type          | Records | Source          | Contents                                 |
| ------------- | ------- | --------------- | ---------------------------------------- |
| `letter`      | 22,258  | Founders Online | Letters and dispatches                   |
| `life`        | 910     | Wikidata        | Births, deaths, marriages, with places   |
| `diary`       | 806     | Founders Online | Diary and journal entries                |
| `essay`       | 423     | Founders Online | Essays, verse, almanacs                  |
| `note`        | 300     | Founders Online | Memoranda, notes, extracts               |
| `instrument`  | 265     | Founders Online | Treaties, contracts, certificates, deeds |
| `office`      | 244     | Wikidata        | Offices and positions held               |
| `proceedings` | 218     | Founders Online | Minutes, reports, resolutions, speeches  |
| `account`     | 162     | Founders Online | Accounts, bills, receipts, lists         |
| `membership`  | 123     | Wikidata        | Society memberships and awards           |
| `petition`    | 71      | Founders Online | Petitions, memorials, proposals          |
| `document`    | 47      | Founders Online | Other documents                          |

Founders Online types are assigned from document titles, so some documents outside `letter` land in a neighbouring type. Wikidata people are matched by name, so a few obscure names may be the wrong person. Only 17 records have full text.

## Data sources and licensing

The code in this repository is MIT licensed (see [LICENSE](LICENSE)).

The data is not ours and is not covered by the MIT license. It comes from:

- [Founders Online](https://founders.archives.gov/) (National Archives and the University of Virginia Press). Its own terms of use apply to the metadata and text taken from it; check them before reusing the data.
- [Wikidata](https://www.wikidata.org/), released under CC0.

Full text where present comes from public-domain sources (Wikisource, Gutenberg).
