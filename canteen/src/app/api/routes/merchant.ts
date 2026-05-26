import { app } from '@/lib/hono';
import { db, sqliteSchema, querySQL } from '@/db';
import { stalls, reviews, dishes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { withRetry } from '@/lib/retry';
import { serializeForJson } from '@/lib/db-utils';

app.get('/merchant/stall', async (c) => {
  const session = await auth();

  if (!session?.user || session.user.role !== 'merchant') {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const merchantId = session.user.id as string;
  
  let stallList;
  try {
    stallList = await (db as any).select().from(sqliteSchema.stalls).where(eq(sqliteSchema.stalls.merchantId, merchantId));
  } catch (e) {
    console.error('Query error:', e);
    return c.json({ success: false, error: 'Query failed' }, 500);
  }

  const stall = stallList[0];

  if (!stall) {
    return c.json({ success: false, error: 'No stall found' }, 404);
  }

  // 获取食堂信息
  const cafeteriaList = await (db as any).select().from(sqliteSchema.cafeterias).where(eq(sqliteSchema.cafeterias.id, stall.cafeteriaId));

  return c.json({ success: true, data: serializeForJson({ ...stall, cafeteria: cafeteriaList[0] }) });
});

app.get('/merchant/dishes', async (c) => {
  const session = await auth();

  if (!session?.user || session.user.role !== 'merchant') {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const stall = await withRetry(() =>
    (db as any).query.stalls.findFirst({
      where: eq(stalls.merchantId, session.user.id),
    })
  );

  if (!stall) {
    return c.json({ success: false, error: 'No stall found' }, 404);
  }

  const dishList = await withRetry(() =>
    (db as any).query.dishes.findMany({
      where: eq(dishes.stallId, (stall as any).id),
      orderBy: dishes.createdAt,
    })
  );

  return c.json({ success: true, data: serializeForJson(dishList) });
});

app.get('/merchant/stats', async (c) => {
  const session = await auth();

  if (!session?.user || session.user.role !== 'merchant') {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const stall = await withRetry(() =>
    (db as any).query.stalls.findFirst({
      where: eq(stalls.merchantId, session.user.id),
    })
  );

  if (!stall) {
    return c.json({ success: false, error: 'No stall found' }, 404);
  }

  const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const recentReviewsRows = await withRetry(() =>
    querySQL(
      'SELECT id, student_id AS studentId, stall_id AS stallId, dish_id AS dishId, rating, content, images, likes, merchant_reply AS merchantReply, replied_at AS repliedAt, created_at AS createdAt, updated_at AS updatedAt FROM reviews WHERE stall_id = ? AND created_at >= ?',
      [(stall as any).id, sevenDaysAgoMs]
    )
  );
  const recentReviews = recentReviewsRows as any[];

  const ratingTrend = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const dayReviews = (recentReviews as any[]).filter((r: any) => {
      const rd = new Date(r.createdAt);
      const ry = rd.getFullYear();
      const rm = String(rd.getMonth() + 1).padStart(2, '0');
      const rdd = String(rd.getDate()).padStart(2, '0');
      return `${ry}-${rm}-${rdd}` === dateStr;
    });

    const avgRating =
      dayReviews.length > 0
        ? dayReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / dayReviews.length
        : 0;

    ratingTrend.push({
      date: dateStr,
      avgRating: Number(avgRating.toFixed(1)),
      count: dayReviews.length,
    });
  }

  const dishList = await withRetry(() =>
    (db as any).query.dishes.findMany({
      where: eq(dishes.stallId, (stall as any).id),
    })
  );

  const dishStats = (dishList as any[])
    .map((dish: any) => ({
      dishId: dish.id,
      name: dish.name,
      reviewCount: dish.totalReviews,
      avgRating: Number(dish.avgRating),
    }))
    .sort((a: any, b: any) => b.reviewCount - a.reviewCount);

  return c.json({
    success: true,
    data: {
      totalViews: (stall as any).totalViews,
      totalReviews: (stall as any).totalReviews,
      avgRating: Number((stall as any).avgRating),
      ratingTrend,
      dishStats,
    },
  });
});

app.get('/merchant/reviews', async (c) => {
  const session = await auth();

  if (!session?.user || session.user.role !== 'merchant') {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const stall = await withRetry(() =>
    (db as any).query.stalls.findFirst({
      where: eq(stalls.merchantId, session.user.id),
    })
  );

  if (!stall) {
    return c.json({ success: false, error: 'No stall found' }, 404);
  }

  const reviewList = await withRetry(() =>
    (db as any).query.reviews.findMany({
      where: eq(reviews.stallId, (stall as any).id),
      orderBy: reviews.createdAt,
      with: { student: { columns: { id: true, name: true, avatar: true } } },
    })
  );

  return c.json({ success: true, data: reviewList });
});
