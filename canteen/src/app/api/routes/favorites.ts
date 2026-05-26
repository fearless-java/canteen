import { app } from '@/lib/hono';
import { db, sqliteSchema, isLocalDB } from '@/db';
import { favorites } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { withRetry } from '@/lib/retry';

function generateUUID() {
  return crypto.randomUUID();
}

app.post('/favorites', async (c) => {
  const session = await auth();

  if (!session?.user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const schema = z.object({
    stallId: z.string().uuid(),
  });

  const result = schema.safeParse(body);
  if (!result.success) {
    return c.json({ success: false, error: '输入数据无效' }, 400);
  }

  const { stallId } = result.data;
  const userId = session.user.id;

  const existing = await withRetry(() =>
    (db as any).query.favorites.findFirst({
      where: and(
        eq(favorites.userId, userId),
        eq(favorites.stallId, stallId)
      ),
    })
  );

  if (existing) {
    return c.json({ success: true, data: existing });
  }

  const [fav] = await (db as any)
    .insert(isLocalDB ? sqliteSchema.favorites : favorites)
    .values({
      id: generateUUID(),
      userId,
      stallId,
      createdAt: isLocalDB ? Date.now() : new Date(),
    })
    .returning();

  return c.json({ success: true, data: fav }, 201);
});

app.delete('/favorites', async (c) => {
  const session = await auth();

  if (!session?.user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const stallId = c.req.query('stallId');
  if (!stallId) {
    return c.json({ success: false, error: 'stallId is required' }, 400);
  }

  const userId = session.user.id;

  await (db as any)
    .delete(isLocalDB ? sqliteSchema.favorites : favorites)
    .where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.stallId, stallId)
      )
    );

  return c.json({ success: true });
});

app.get('/favorites/check', async (c) => {
  const session = await auth();

  if (!session?.user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const stallId = c.req.query('stallId');
  if (!stallId) {
    return c.json({ success: false, error: 'stallId is required' }, 400);
  }

  const existing = await withRetry(() =>
    (db as any).query.favorites.findFirst({
      where: and(
        eq(favorites.userId, session.user.id),
        eq(favorites.stallId, stallId)
      ),
    })
  );

  return c.json({ success: true, data: { favorited: !!existing } });
});

app.get('/favorites', async (c) => {
  const session = await auth();

  if (!session?.user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const data = await withRetry(() =>
    (db as any).query.favorites.findMany({
      where: eq(favorites.userId, session.user.id),
      with: {
        stall: {
          columns: {
            id: true,
            name: true,
            description: true,
            image: true,
            avgRating: true,
            totalReviews: true,
            isActive: true,
            cafeteriaId: true,
          },
          with: {
            cafeteria: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })
  );

  return c.json({ success: true, data });
});
