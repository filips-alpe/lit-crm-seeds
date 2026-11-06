# Jefferson dataset

Records built from the Internet Archive OCR of _The Writings of Thomas Jefferson_, Definitive Edition, ed. Lipscomb & Bergh (Thomas Jefferson Memorial Association, Washington, D.C., 1905). The item [`writingsofthomas0000vari_v5r4`](https://archive.org/details/writingsofthomas0000vari_v5r4) holds volumes I and II of the 20-volume edition. The other volumes are out of scope.

Counts, link rate, OCR issues and unlinked names are in [`REPORT.md`](REPORT.md). Every OCR correction is listed with its raw line in [`corrections.tsv`](corrections.tsv).

## Running it

```sh
bunx tsx prisma/seed/sources/jefferson/fetch.ts   # network, once: caches raw.txt + page_numbers.json
bunx tsx prisma/seed/sources/jefferson/build.ts   # no network: writes the files below
bunx prisma db seed                                # loads them with the Franklin data
```

`fetch.ts` downloads two files into `.workflow/scratch/jefferson/`, which is gitignored like the Smyth cache, and skips any file that is already there. It sends the User-Agent `lit-crm-seed/1.0 (one-off download of public-domain text for a research seed dataset)`. `build.ts` reads only that cache and `gazetteer.yaml`. Its output is deterministic: two runs give byte-identical files. It writes:

- `prisma/seed/generated/jefferson.generated.json`: documents, entities and mentions. This file is committed, and it is what the seed reads.
- `REPORT.md` and `corrections.tsv` in this folder.

The seed adds the Jefferson records after the Franklin ones and leaves the Franklin records and types unchanged. The Jefferson types live in `prisma/seed/data/types-jefferson.yaml`.

## Pipeline

| Step     | File                            | What it does                                                                                                                                                                                                                                                                                                           |
| -------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page map | `pages.ts`                      | Recognises running heads ("2 Jefferson’s Works", "The Anas 285"), folios ("(265)") and signature marks ("VOL. I—12"). Uses them to give each raw line its volume and printed page. IA's `page_numbers.json` turns a printed page into a book-reader link (`/page/n<index>`).                                           |
| Split    | `contents.ts`, `split.ts`       | A hand-checked contents map gives the first raw line of each top-level record. Three containers split further: the Anas at each dated memorandum or Anas heading, Notes on Virginia at each `QUERY`, and the Manual at each `SECTION`. Every record keeps its raw line range, so each boundary traces back to the OCR. |
| Cleanup  | `clean.ts`                      | Only mechanical fixes, each logged (see below).                                                                                                                                                                                                                                                                        |
| Entities | `gazetteer.yaml`, `entities.ts` | Exact, case-sensitive, whole-word matching of curated variant names, longest first. Ambiguous names are left unlinked.                                                                                                                                                                                                 |
| Report   | `report.ts`                     | Writes `REPORT.md`.                                                                                                                                                                                                                                                                                                    |

### OCR cleanup

The wording is never changed. Every word in a record's text is in the raw OCR, in the same order. The only fixes are:

- **furniture**: running heads, folios and signature marks are removed.
- **noise**: short blocks that are mostly garbled are removed. These come from the OCR of illustration plates, library stamps and pages printed sideways. A block is removed only if at least 30% of its tokens are garbled and fewer than half of its words occur five or more times in the book. This keeps Latin, plant lists and garbled datelines.
- **page-join**: a paragraph split by a page break is rejoined. This happens when the page did not end a sentence, or the next page starts in lower case.
- **footnote**: a note printed at the foot of a page, interrupting a paragraph, is moved to follow that paragraph.
- **hyphenation**: a word broken at a line end ("discon-" / "tinued") is rejoined. The hyphen is kept when the book prints the word hyphenated mid-line more often ("twenty-five").

Line breaks inside a paragraph come from the printer's column width, so they become spaces. Paragraphs are separated by a blank line. Spelling is never corrected: OCR misreads such as "tv" and "Fefferson" stay as printed.

## Types and why

The types come from what the two volumes actually contain. Each record is assigned exactly one.

| Type                                      | Records                                                                                                                                                                                                         | Rationale                                                                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `memoir`                                  | Autobiography, in four parts                                                                                                                                                                                    | A retrospective narrative written in 1821. It is split where the edition embeds whole documents, which become their own records.    |
| `memorandum`                              | The 110 Anas entries, the Anas explanation, notes on Wythe, Note C, Note G                                                                                                                                      | Dated private notes made "in aid of my memory". The Anas is a run of these, so each dated entry is one record.                      |
| `epistle`                                 | Letters printed in the volumes: to Saunderson, Wells and Wythe, from Washington, Vergennes's despatch, Lincoln's 1859 letter                                                                                    | Have a sender, recipient and date. Kept apart from Franklin's `letter` type, so that type's renderer, map and counts are unchanged. |
| `paper`                                   | The Declaration as reported, the Barbary proposals, the 1774 instructions, the crimes bill, the Money Unit notes, the draft constitution, the Religious Freedom act, the Logan appendix, Thomson's observations | Public or official documents drafted for a body, not a correspondent.                                                               |
| `query`                                   | The 23 Queries of Notes on Virginia                                                                                                                                                                             | Each chapter answers one of Marbois's questions. The question is printed as its heading and used as the title.                      |
| `rule`                                    | The Manual's introduction and its 53 Sections                                                                                                                                                                   | Numbered sections of a procedural handbook.                                                                                         |
| `editorial`                               | Special Introduction, introductory notes, Carter's University of Virginia address                                                                                                                               | Matter from the 1903–05 edition, not by Jefferson.                                                                                  |
| `person`, `place`, `organization`, `work` | Entities                                                                                                                                                                                                        | The kinds of things the text names. Only entities the text mentions at least once get a record.                                     |

Records have no creator. The author goes in the `from` text field. This keeps the existing Franklin-world dashboards unchanged, including `tjefferson`, which covers Jefferson's correspondence with Franklin. Approximate dates (an edition's editorial matter, an undated paper) are marked "Date approximate" in the record's source note.

## Entities and mentions

`gazetteer.yaml` lists each entity with a canonical name, a short description and the variant names the text uses for it. Resolution follows these rules:

- A variant claimed by one entity links to it. "Colonel Hamilton", "A. Hamilton" and "Hamilton" all link to Alexander Hamilton.
- A variant claimed by two entities is ambiguous, so it is not linked. The same goes for the names under `unlinked`: bare surnames and titles the text uses for several people or things ("Randolph", "Washington", "the President", "Congress"). Listing them also stops a shorter variant inside them from matching. Nothing is guessed from context.
- A space in a variant matches one or more spaces but never a paragraph break.

A mention is stored as a `RecordMention` row (`lit_record_mention`): source record, entity record, and `start`/`end` UTF-16 offsets into the source's `text`. The text itself is not changed.

To improve linking, edit `gazetteer.yaml` and rebuild. The report's "names not in the gazetteer" table lists likely candidates.

## The best page

`/page/[id]` shows any record, document or entity, as one page assembled from its data (`src/lib/bestPage/assemble.ts`). It has these sections:

- details: non-empty layout fields
- the text, with mentions as links
- the names this text mentions
- where this record is mentioned, with context
- entities mentioned alongside it
- linked records
- sources

A section with no data is left out. No type or entity has its own template. The server load builds the page as plain data, so a server render and a client-side navigation produce the same page. `/data/[id]` links to it with "Open page".

## Source references

- Every document cites its volume and pages, and its OCR line range, in `note`. `references` holds a book-reader link to its first page.
- Every entity cites where it is first mentioned (volume, page, OCR line) in `note`, and links to that page.

Front matter has no printed page numbers, so its records cite the item page instead.
