import type { PrismaClient } from '../../generated/prisma/client';
import { users, types, projects, records } from './load';

export async function seed(prisma: PrismaClient) {
  await prisma.record.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.type.deleteMany({});
  await prisma.user.deleteMany({});

  const userRows = await Promise.all(users.map((u) => prisma.user.create({ data: u })));
  const userIdByUsername = new Map(userRows.map((u) => [u.username, u.id]));
  const user = await prisma.user.findUniqueOrThrow({ where: { username: 'bfranklin' } });

  const typeRows = await Promise.all(types.map((t) => prisma.type.create({ data: t })));
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

  for (const r of records) {
    const typeId = typeIdByCode.get(r.type);
    if (!typeId) throw new Error(`Unknown type: ${r.type}`);
    const projectId = projectIdByCode.get(r.project);
    if (!projectId) throw new Error(`Unknown project: ${r.project}`);
    const userId = r.user ? userIdByUsername.get(r.user) : user.id;
    if (!userId) throw new Error(`Unknown user: ${r.user}`);
    const remindToId = r.remindTo ? userIdByUsername.get(r.remindTo) : undefined;
    if (r.remindTo && !remindToId) throw new Error(`Unknown remindTo: ${r.remindTo}`);
    await prisma.record.create({
      data: {
        typeId,
        userId,
        projectId,
        remindToId,
        status: r.status ?? 'ACTIVE',
        date: r.date,
        allDay: r.allDay ?? false,
        sum: r.sum ?? 0,
        hours: r.hours ?? 0,
        totalPrice: r.totalPrice ?? 0,
        startDate: r.startDate,
        endDate: r.endDate,
        note: r.note,
        footNote: r.footNote,
        alternateIds: r.alternateIds,
        projectNote: r.projectNote,
        typeNote: r.typeNote,
        priceNote: r.priceNote,
        bookNote: r.bookNote,
        placeFrom: r.placeFrom,
        placeTo: r.placeTo,
      },
    });
  }
}
