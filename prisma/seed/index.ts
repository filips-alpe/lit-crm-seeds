import type { PrismaClient } from '../../generated/prisma/client';
import { users, types, projects, records } from './load';

export async function seed(prisma: PrismaClient) {
  await prisma.projectRecord.deleteMany({});
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

  // First pass: create records and the project join rows.
  const recordIdByKey = new Map<string, string>();
  const linked: { id: string; linkedTo: string }[] = [];
  for (const r of records) {
    const typeId = typeIdByCode.get(r.type);
    if (!typeId) throw new Error(`Unknown type: ${r.type}`);
    const creatorId = r.user ? userIdByUsername.get(r.user) : user.id;
    if (!creatorId) throw new Error(`Unknown user: ${r.user}`);
    const assigneeId = r.remindTo ? userIdByUsername.get(r.remindTo) : undefined;
    if (r.remindTo && !assigneeId) throw new Error(`Unknown remindTo: ${r.remindTo}`);
    const projectsCreate = r.projects.map((code) => {
      const projectId = projectIdByCode.get(code);
      if (!projectId) throw new Error(`Unknown project: ${code}`);
      return { projectId };
    });

    const created = await prisma.record.create({
      data: {
        typeId,
        creatorId,
        assigneeId,
        status: r.status ?? 'ACTIVE',
        title: r.title,
        description: r.description,
        text: r.text,
        note: r.note,
        references: r.references,
        date: r.date,
        start: r.start,
        end: r.end,
        allDay: r.allDay,
        sum: r.sum,
        hours: r.hours,
        total: r.total,
        unit: r.unit,
        from: r.from,
        to: r.to,
        projects: { create: projectsCreate },
      },
    });

    if (r.key) recordIdByKey.set(r.key, created.id);
    if (r.linkedTo) linked.push({ id: created.id, linkedTo: r.linkedTo });
  }

  // Second pass: wire up self-links now that every record exists.
  for (const { id, linkedTo } of linked) {
    const recordId = recordIdByKey.get(linkedTo);
    if (!recordId) throw new Error(`Unknown linkedTo key: ${linkedTo}`);
    await prisma.record.update({ where: { id }, data: { recordId } });
  }
}
