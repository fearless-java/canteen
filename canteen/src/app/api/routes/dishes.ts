import { app } from '@/lib/hono';
import { db, executeSQL, querySQL } from '@/db';
import { serializeForJson } from '@/lib/db-utils';
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

  // 使用原生 SQL 验证商家权限
  const stalls_result = await querySQL(
    'SELECT id FROM stalls WHERE id = ? AND merchant_id = ?',
    [stallId, session.user.id]
  );

  if (!stalls_result || stalls_result.length === 0) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  const now = Date.now();
  const id = crypto.randomUUID();

  // 使用原生 SQL 插入
  await executeSQL(
    'INSERT INTO dishes (id, name, description, stall_id, price, image, is_available, avg_rating, total_reviews, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0, ?, ?)',
    [id, name, description || null, stallId, price, image || null, now, now]
  );

  // 获取刚插入的数据
  const dish_result = await querySQL(
    'SELECT * FROM dishes WHERE id = ?',
    [id]
  );

  return c.json({ success: true, data: serializeForJson(dish_result[0]) }, 201);
});

app.put('/dishes/:id', async (c) => {
  const session = await auth();

  if (!session?.user || session.user.role !== 'merchant') {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');
  const body = await c.req.json();

  // 使用原生 SQL 查询菜品并验证商家权限
  const existingDish: any[] = await querySQL(
    `SELECT d.*, s.merchant_id as stall_merchant_id
     FROM dishes d
     JOIN stalls s ON d.stall_id = s.id
     WHERE d.id = ?`,
    [id]
  );

  if (!existingDish || existingDish.length === 0) {
    return c.json({ success: false, error: 'Dish not found' }, 404);
  }

  if (existingDish[0].stall_merchant_id !== session.user.id) {
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

  // 构建更新字段
  const updateFields: string[] = [];
  const updateValues: any[] = [];

  if (result.data.name !== undefined) {
    updateFields.push('name = ?');
    updateValues.push(result.data.name);
  }
  if (result.data.description !== undefined) {
    updateFields.push('description = ?');
    updateValues.push(result.data.description);
  }
  if (result.data.price !== undefined) {
    updateFields.push('price = ?');
    updateValues.push(result.data.price);
  }
  if (result.data.image !== undefined) {
    updateFields.push('image = ?');
    updateValues.push(result.data.image);
  }
  if (result.data.isAvailable !== undefined) {
    updateFields.push('is_available = ?');
    updateValues.push(result.data.isAvailable ? 1 : 0);
  }

  if (updateFields.length === 0) {
    return c.json({ success: false, error: 'No fields to update' }, 400);
  }

  updateFields.push('updated_at = ?');
  updateValues.push(Date.now());
  updateValues.push(id);

  // 执行更新
  await executeSQL(
    `UPDATE dishes SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  // 获取更新后的数据
  const updated_result: any[] = await querySQL(
    'SELECT * FROM dishes WHERE id = ?',
    [id]
  );

  return c.json({ success: true, data: serializeForJson(updated_result[0]) });
});

app.delete('/dishes/:id', async (c) => {
  const session = await auth();

  if (!session?.user || session.user.role !== 'merchant') {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');

  // 使用原生 SQL 查询菜品并验证商家权限
  const existingDish: any[] = await querySQL(
    `SELECT d.*, s.merchant_id as stall_merchant_id
     FROM dishes d
     JOIN stalls s ON d.stall_id = s.id
     WHERE d.id = ?`,
    [id]
  );

  if (!existingDish || existingDish.length === 0) {
    return c.json({ success: false, error: 'Dish not found' }, 404);
  }

  if (existingDish[0].stall_merchant_id !== session.user.id) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  await executeSQL('DELETE FROM dishes WHERE id = ?', [id]);

  return c.json({ success: true, message: 'Dish deleted' });
});
