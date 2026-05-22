import type { PrismaClient } from '../../generated/prisma/client';
import { users, types, orders, records } from './load';

export async function seed(prisma: PrismaClient) {
  await prisma.record.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.type.deleteMany({});
  await prisma.user.deleteMany({});

  const userRows = await Promise.all(users.map((u) => prisma.user.create({ data: u })));
  const userIdByUsername = new Map(userRows.map((u) => [u.username, u.id]));
  const user = await prisma.user.findUniqueOrThrow({ where: { username: 'bfranklin' } });

  const typeRows = await Promise.all(types.map((t) => prisma.type.create({ data: t })));
  const typeIdByCode = new Map(typeRows.map((t) => [t.code, t.id]));

  const orderRows = await Promise.all(
    orders.map((o) => {
      const assigneeId = o.assignee ? userIdByUsername.get(o.assignee) : user.id;
      if (!assigneeId) throw new Error(`Unknown assignee: ${o.assignee}`);
      return prisma.order.create({
        data: {
          code: o.code,
          description: o.description,
          color: o.color,
          status: o.status ?? 'ACTIVE',
          creatorId: user.id,
          assigneeId,
        },
      });
    }),
  );
  const orderIdByCode = new Map(orderRows.map((o) => [o.code, o.id]));

  for (const r of records) {
    const typeId = typeIdByCode.get(r.type);
    if (!typeId) throw new Error(`Unknown type: ${r.type}`);
    const orderId = orderIdByCode.get(r.order);
    if (!orderId) throw new Error(`Unknown order: ${r.order}`);
    const userId = r.user ? userIdByUsername.get(r.user) : user.id;
    if (!userId) throw new Error(`Unknown user: ${r.user}`);
    const remindToId = r.remindTo ? userIdByUsername.get(r.remindTo) : undefined;
    if (r.remindTo && !remindToId) throw new Error(`Unknown remindTo: ${r.remindTo}`);
    await prisma.record.create({
      data: {
        typeId,
        userId,
        orderId,
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
        idNote: r.idNote,
        orderNote: r.orderNote,
        typeNote: r.typeNote,
        priceNote: r.priceNote,
        bookNote: r.bookNote,
        placeFrom: r.placeFrom,
        placeTo: r.placeTo,
      },
    });
  }
}
