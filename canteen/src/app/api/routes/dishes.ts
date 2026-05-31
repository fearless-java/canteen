import { app } from '@/lib/hono';
import { db, isLocalDB, sqliteSchema } from '@/db';
import { serializeForJson, toDbDate } from '@/lib/db-utils';
import { dishes, stalls, reviews } from '@/db/schema';
import { eq, desc, like, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { withRetry } from '@/lib/retry';

app.get('/dishes', async (c) => {
  const stallId = c.req.query('stallId');

  if (!stallId) {
    return c.json({ success: false, error: 'stallId is required' }, 400);
  }

  const data = await withRetry(() =>
    (db as any).query.dishes.findMany({
      where: eq(dishes.stallId, stallId),
      orderBy: desc(dishes.totalReviews),
    })
  );

  return c.json({ success: true, data });
});

app.get('/dishes/search', async (c) => {
  const q = c.req.query('q')?.trim();
  const cafeteriaIds = c.req.query('cafeteriaIds');

  if (!q) {
    return c.json({ success: true, data: [] });
  }

  const conditions: any[] = [like(dishes.name, `%${q}%`)];

  if (cafeteriaIds) {
    const ids = cafeteriaIds.split(',').filter(Boolean);
    if (ids.length > 0) {
      const stallsInCafeteria = await withRetry(() =>
        (db as any).query.stalls.findMany({
          where: inArray(stalls.cafeteriaId, ids),
          columns: { id: true },
        })
      );
      const stallIds = (stallsInCafeteria as any[]).map((s: any) => s.id);
      if (stallIds.length > 0) {
        conditions.push(inArray(dishes.stallId, stallIds));
      }
    }
  }

  const data = await withRetry(() =>
    (db as any).query.dishes.findMany({
      where: and(...conditions),
      with: {
        stall: {
          with: {
            cafeteria: true,
          },
        },
      },
      orderBy: desc(dishes.avgRating),
      limit: 50,
    })
  );

  return c.json({ success: true, data: serializeForJson(data) });
});

app.get('/dishes/:id', async (c) => {
  const id = c.req.param('id');

  const dish: any = await withRetry(() =>
    (db as any).query.dishes.findFirst({
      where: eq(dishes.id, id),
    })
  );

  if (!dish) {
    return c.json({ success: false, error: 'Dish not found' }, 404);
  }

  const stall: any = await withRetry(() =>
    (db as any).query.stalls.findFirst({
      where: eq(stalls.id, dish.stallId),
    })
  );

  const dishReviews = await withRetry(() =>
    (db as any).query.reviews.findMany({
      where: eq(reviews.dishId, id),
      orderBy: desc(reviews.createdAt),
      limit: 10,
      with: {
        student: {
          columns: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    })
  );

  return c.json({
    success: true,
    data: serializeForJson({
      ...dish,
      stall,
      reviews: dishReviews,
    }),
  });
});

app.post('/dishes', async (c) => {
  const session = await auth();

  if (!session?.user || session.user.role !== 'merchant') {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();

  const dishSchema = z.object({
    name: z.string().min(1, '菜品名称不能为空'),
    description: z.string().optional(),
    stallId: z.string().uuid(),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/, '价格格式不正确'),
    image: z.string().optional(),
  });

  const result = dishSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        success: false,
        error: result.error.issues[0]?.message || '输入数据无效',
      },
      400
    );
  }

  const { name, description, stallId, price, image } = result.data;

  const ownedStall = await withRetry(() =>
    (db as any).query.stalls.findFirst({
      where: and(eq(stalls.id, stallId), eq(stalls.merchantId, session.user.id)),
    })
  );

  if (!ownedStall) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  const id = crypto.randomUUID();
  const now = toDbDate(new Date(), isLocalDB);

  await (db as any)
    .insert(isLocalDB ? sqliteSchema.dishes : dishes)
    .values({
      id,
      name,
      description: description || null,
      stallId,
      price,
      image: image || null,
      isAvailable: true,
      avgRating: '0',
      totalReviews: 0,
      createdAt: now,
      updatedAt: now,
    });

  const newDish = await withRetry(() =>
    (db as any).query.dishes.findFirst({
      where: eq(dishes.id, id),
    })
  );

  return c.json({ success: true, data: serializeForJson(newDish) }, 201);
});

app.put('/dishes/:id', async (c) => {
  const session = await auth();

  if (!session?.user || session.user.role !== 'merchant') {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');
  const body = await c.req.json();

  const existingDish: any = await withRetry(() =>
    (db as any).query.dishes.findFirst({
      where: eq(dishes.id, id),
    })
  );

  if (!existingDish) {
    return c.json({ success: false, error: 'Dish not found' }, 404);
  }

  const dishStall: any = await withRetry(() =>
    (db as any).query.stalls.findFirst({
      where: eq(stalls.id, existingDish.stallId),
    })
  );

  if (!dishStall || dishStall.merchantId !== session.user.id) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    image: z.string().optional(),
    isAvailable: z.boolean().optional(),
  });

  const result = updateSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        success: false,
        error: result.error.issues[0]?.message || '输入数据无效',
      },
      400
    );
  }

  if (Object.keys(result.data).length === 0) {
    return c.json({ success: false, error: 'No fields to update' }, 400);
  }

  const updateData: Record<string, any> = {
    updatedAt: toDbDate(new Date(), isLocalDB),
  };

  if (result.data.name !== undefined) {
    updateData.name = result.data.name;
  }
  if (result.data.description !== undefined) {
    updateData.description = result.data.description;
  }
  if (result.data.price !== undefined) {
    updateData.price = result.data.price;
  }
  if (result.data.image !== undefined) {
    updateData.image = result.data.image;
  }
  if (result.data.isAvailable !== undefined) {
    updateData.isAvailable = result.data.isAvailable;
  }

  await (db as any)
    .update(isLocalDB ? sqliteSchema.dishes : dishes)
    .set(updateData)
    .where(eq(dishes.id, id));

  const updatedDish = await withRetry(() =>
    (db as any).query.dishes.findFirst({
      where: eq(dishes.id, id),
    })
  );

  return c.json({ success: true, data: serializeForJson(updatedDish) });
});

app.delete('/dishes/:id', async (c) => {
  const session = await auth();

  if (!session?.user || session.user.role !== 'merchant') {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');

  const existingDish: any = await withRetry(() =>
    (db as any).query.dishes.findFirst({
      where: eq(dishes.id, id),
    })
  );

  if (!existingDish) {
    return c.json({ success: false, error: 'Dish not found' }, 404);
  }

  const dishStall: any = await withRetry(() =>
    (db as any).query.stalls.findFirst({
      where: eq(stalls.id, existingDish.stallId),
    })
  );

  if (!dishStall || dishStall.merchantId !== session.user.id) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  await (db as any)
    .delete(isLocalDB ? sqliteSchema.dishes : dishes)
    .where(eq(dishes.id, id));

  return c.json({ success: true, message: 'Dish deleted' });
});
