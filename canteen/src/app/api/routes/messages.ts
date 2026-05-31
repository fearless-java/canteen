import { app } from '@/lib/hono';
import { db, sqliteSchema, isLocalDB } from '@/db';
import { messages } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { withRetry } from '@/lib/retry';

app.get('/messages', async (c) => {
  const session = await auth();

  if (!session?.user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const data = await withRetry(() =>
      (db as any).query.messages.findMany({
        where: eq(messages.userId, session.user.id),
        orderBy: desc(messages.createdAt),
      })
    );

    return c.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return c.json({ success: true, data: [] });
  }
});

app.get('/messages/unread-count', async (c) => {
  const session = await auth();

  if (!session?.user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const result = await withRetry(() =>
      (db as any)
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(eq(messages.userId, session.user.id), eq(messages.isRead, false))
        )
    ) as any[];

    const count = result[0]?.count || 0;

    return c.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Failed to fetch unread count:', error);
    return c.json({ success: true, data: { count: 0 } });
  }
});

app.get('/messages/:id', async (c) => {
  const session = await auth();

  if (!session?.user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const messageId = c.req.param('id');

  const message = await withRetry(() =>
    (db as any).query.messages.findFirst({
      where: and(
        eq(messages.id, messageId),
        eq(messages.userId, session.user.id)
      ),
    })
  );

  if (!message) {
    return c.json({ success: false, error: '消息不存在' }, 404);
  }

  return c.json({ success: true, data: message });
});

app.patch('/messages/:id/read', async (c) => {
  const session = await auth();

  if (!session?.user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const messageId = c.req.param('id');

  const message = await withRetry(() =>
    (db as any).query.messages.findFirst({
      where: and(
        eq(messages.id, messageId),
        eq(messages.userId, session.user.id)
      ),
    })
  );

  if (!message) {
    return c.json({ success: false, error: '消息不存在' }, 404);
  }

  await (db as any)
    .update(isLocalDB ? sqliteSchema.messages : messages)
    .set({ isRead: true })
    .where(eq(messages.id, messageId));

  return c.json({ success: true });
});

app.post('/messages/read-all', async (c) => {
  const session = await auth();

  if (!session?.user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  await (db as any)
    .update(isLocalDB ? sqliteSchema.messages : messages)
    .set({ isRead: true })
    .where(
      and(eq(messages.userId, session.user.id), eq(messages.isRead, false))
    );

  return c.json({ success: true });
});

app.delete('/messages/:id', async (c) => {
  const session = await auth();

  if (!session?.user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const messageId = c.req.param('id');

  const message = await withRetry(() =>
    (db as any).query.messages.findFirst({
      where: and(
        eq(messages.id, messageId),
        eq(messages.userId, session.user.id)
      ),
    })
  );

  if (!message) {
    return c.json({ success: false, error: '消息不存在' }, 404);
  }

  await (db as any)
    .delete(messages)
    .where(eq(messages.id, messageId));

  return c.json({ success: true });
});
