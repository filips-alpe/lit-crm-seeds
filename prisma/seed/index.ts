import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma/client';
import { users, types, projects, records } from './load';

// Postgres parameter limit is 65535; createMany batches are kept well under
// that per call (comfortably so even with the widest Record row).
const BATCH_SIZE = 2000;

async function createManyChunked<T>(
  rows: T[],
  create: (chunk: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await create(rows.slice(i, i + BATCH_SIZE));
  }
}

export async function seed(prisma: PrismaClient) {
  await prisma.projectRecord.deleteMany({});
  await prisma.record.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.type.deleteMany({});
  await prisma.user.deleteMany({});

  const userRows = await Promise.all(users.map((u) => prisma.user.create({ data: u })));
  const userIdByUsername = new Map(userRows.map((u) => [u.username, u.id]));
  const user = await prisma.user.findUniqueOrThrow({ where: { username: 'bfranklin' } });

  // A type is "created" the day its first record of that kind is entered — Ben
  // adds the shape to his CRM the moment he first needs it.
  const firstEnteredByType = new Map<string, Date>();
  for (const r of records) {
    if (!r.entered) continue;
    const d = new Date(r.entered);
    const cur = firstEnteredByType.get(r.type);
    if (!cur || d < cur) firstEnteredByType.set(r.type, d);
  }

  const typeRows = await Promise.all(
    types.map((t) => {
      const createdAt = firstEnteredByType.get(t.code);
      return prisma.type.create({
        data: {
          ...t,
          ...(createdAt ? { createdAt } : {}),
        },
      });
    }),
  );
  const typeIdByCode = new Map(typeRows.map((t) => [t.code, t.id]));

  const projectRows = await Promise.all(
    projects.map((p) => {
      const assigneeId = p.assignee ? userIdByUsername.get(p.assignee) : user.id;
      if (!assigneeId) throw new Error(`Unknown assignee: ${p.assignee}`);
      return prisma.project.create({
        data: {
          code: p.code,
          description: p.description,
          color: p.color,
          status: p.status ?? 'ACTIVE',
          creatorId: user.id,
          assigneeId,
        },
      });
    }),
  );
  const projectIdByCode = new Map(projectRows.map((p) => [p.code, p.id]));

  // Records are generated client-side with explicit ids (instead of relying
  // on the DB default) so the project join rows and the self-link pass below
  // can reference them without a round trip per row — the whole set loads
  // via a handful of batched createMany calls instead of one create() per
  // record, which matters at Founders-Online-import scale (~15k records).
  const projectJoinRows: { projectId: string; recordId: string }[] = [];

  const recordRows = records.map((r, i) => {
    const typeId = typeIdByCode.get(r.type);
    if (!typeId) throw new Error(`Unknown type: ${r.type}`);
    const creatorId = r.user ? userIdByUsername.get(r.user) : null;
    if (r.user && !creatorId) throw new Error(`Unknown user: ${r.user}`);
    const assigneeId = r.assignee ? userIdByUsername.get(r.assignee) : undefined;
    if (r.assignee && !assigneeId) throw new Error(`Unknown assignee: ${r.assignee}`);

    // `createdAt` is the moment Ben logged the entry. Records are listed
    // chronologically, so nudge each one a millisecond past its predecessor to
    // keep a strict "one after another" order even when entries share a day.
    if (!r.entered) throw new Error(`Record has no entered date: ${r.title ?? r.type}`);
    const createdAt = new Date(new Date(r.entered).getTime() + i);

    const id = randomUUID();

    for (const code of r.projects) {
      const projectId = projectIdByCode.get(code);
      if (!projectId) throw new Error(`Unknown project: ${code}`);
      projectJoinRows.push({ projectId, recordId: id });
    }

    return {
      id,
      typeId,
      creatorId,
      assigneeId,
      status: 'ACTIVE' as const,
      createdAt,
      title: r.title,
      description: r.description,
      text: r.text,
      note: r.note,
      references: r.references,
      // The timeline runs on New Style (createdAt); `date` carries the date as
      // recorded, i.e. Old Style for documents before the 1752 calendar reform.
      date: r.date ? new Date(r.date) : undefined,
      start: r.start ? new Date(r.start) : undefined,
      end: r.end ? new Date(r.end) : undefined,
      allDay: r.allDay,
      from: r.from,
      to: r.to,
      fromGeo: r.fromGeo,
      toGeo: r.toGeo,
    };
  });

  await createManyChunked(recordRows, (chunk) => prisma.record.createMany({ data: chunk }));
  await createManyChunked(projectJoinRows, (chunk) =>
    prisma.projectRecord.createMany({ data: chunk }),
  );
}
