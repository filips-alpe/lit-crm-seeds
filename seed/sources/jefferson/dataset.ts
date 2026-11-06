/** Shape of prisma/seed/generated/jefferson.generated.json (written by build.ts, read by the seeder). */

/** A record in the generated dataset; `key` is stable across rebuilds. */
export type JeffersonRecord = {
  key: string;
  type: string;
  title: string;
  description?: string;
  text?: string;
  note?: string;
  references: string[];
  entered: string;
  date?: string;
  from?: string;
  to?: string;
};

/** A linked mention: characters [start, end) of `record`'s text name `entity`. */
export type JeffersonMention = { record: string; entity: string; start: number; end: number };

export type JeffersonDataset = {
  source: { item: string; url: string; edition: string };
  records: JeffersonRecord[];
  mentions: JeffersonMention[];
};
