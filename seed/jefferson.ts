/**
 * Maps the Jefferson dataset to database rows. Pure (ids come from `newId`),
 * so it is unit-tested without a database; db.ts inserts the rows.
 *
 * Documents and entities are ordinary records. Records carry no creator: the
 * author is the `from` text field, so the Franklin-world users' dashboards
 * (including tjefferson's, which covers his correspondence with Franklin)
 * are unchanged by this dataset.
 */
import type { JeffersonDataset } from './sources/jefferson/dataset';

export type JeffersonRecordRow = {
  id: string;
  typeId: string;
  status: 'ACTIVE';
  createdAt: Date;
  title: string;
  description?: string;
  text?: string;
  note?: string;
  references: string[];
  date?: Date;
  from?: string;
  to?: string;
};

export type MentionRow = { sourceId: string; entityId: string; start: number; end: number };

export function jeffersonRows(
  dataset: JeffersonDataset,
  typeIdByCode: Map<string, string>,
  newId: () => string,
): { records: JeffersonRecordRow[]; mentions: MentionRow[] } {
  const idByKey = new Map<string, string>();
  const records = dataset.records.map((r, i) => {
    const typeId = typeIdByCode.get(r.type);
    if (!typeId) throw new Error(`Unknown type: ${r.type}`);
    if (idByKey.has(r.key)) throw new Error(`Duplicate Jefferson record key: ${r.key}`);
    const id = newId();
    idByKey.set(r.key, id);
    return {
      id,
      typeId,
      status: 'ACTIVE' as const,
      // Same convention as the Franklin records: entry time plus a millisecond
      // per position keeps a strict order among records of the same day.
      createdAt: new Date(new Date(r.entered).getTime() + i),
      title: r.title,
      description: r.description,
      text: r.text,
      note: r.note,
      references: r.references,
      date: r.date ? new Date(r.date) : undefined,
      from: r.from,
      to: r.to,
    };
  });
  const mentions = dataset.mentions.map((m) => {
    const sourceId = idByKey.get(m.record);
    const entityId = idByKey.get(m.entity);
    if (!sourceId || !entityId)
      throw new Error(`Mention of unknown record: ${m.record} → ${m.entity}`);
    return { sourceId, entityId, start: m.start, end: m.end };
  });
  return { records, mentions };
}

/** Earliest entry date per type code, for the type's own createdAt. */
export function firstEnteredByType(dataset: JeffersonDataset): Map<string, Date> {
  const out = new Map<string, Date>();
  for (const r of dataset.records) {
    const d = new Date(r.entered);
    const cur = out.get(r.type);
    if (!cur || d < cur) out.set(r.type, d);
  }
  return out;
}
