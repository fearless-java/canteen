import { app } from '@/lib/hono';
import { db, sqliteSchema, isLocalDB } from '@/db';
import { reviews, stalls, dishes, reviewLikes } from '@/db/schema';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { withRetry } from '@/lib/retry';
import { calculateHotScore } from '@/lib/review-utils';

function generateUUID() {
  return crypto.randomUUID();
}

async function enrichReviews(reviewsList: any[], sessionUserId?: string) {
  if (reviewsList.length === 0) return [];

  let likedReviewIds = new Set<string>();
  if (sessionUserId) {
    const likes = await withRetry(() =>
      (db as any).query.reviewLikes.findMany({
        where: and(
          eq(reviewLikes.studentId, sessionUserId),
          inArray(reviewLikes.reviewId, reviewsList.map((r) => r.id))
        ),
      })
    );
    likedReviewIds = new Set((likes as any[]).map((l) => l.reviewId));
  }

  return reviewsList.map((r) => ({
    ...r,
    likedByMe: likedReviewIds.has(r.id),
    isOwn: sessionUserId ? r.studentId === sessionUserId : false,
    hotScore: calculateHotScore(r.likes, r.createdAt),
  }));
}

app.get('/reviews', async (c) => {
  const stallId = c.req.query('stallId');

  if (!stallId) {
    return c.json({ success: false, error: 'stallId is required' }, 400);
  }

  const session = await auth();

  const data = await withRetry(() =>
    (db as any).query.reviews.findMany({
      where: eq(reviews.stallId, stallId),
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

  const enriched = await enrichReviews(data as any[], session?.user?.id);
  enriched.sort((a, b) => b.hotScore - a.hotScore);

  return c.json({ success: true, data: enriched });
});

app.post('/reviews', async (c) => {
  const session = await auth();

  if (!session?.user || session.user.role !== 'student') {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();

  const reviewSchema = z.object({
    stallId: z.string().uuid(),
    dishId: z.string().uuid().optional(),
    rating: z.number().min(1).max(5),
    content: z.string().min(1, '评价内容不能为空'),
    images: z.array(z.string()).default([]),
  });

  const result = reviewSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        success: false,
        error: result.error.issues[0]?.message || '输入数据无效',
      },
      400
    );
  }

  const data = result.data;

  const [review] = await (db as any)
    .insert(isLocalDB ? sqliteSchema.reviews : reviews)
    .values({
      id: generateUUID(),
      studentId: session.user.id,
      stallId: data.stallId,
      dishId: data.dishId,
      rating: data.rating,
      content: data.content,
      images: isLocalDB ? JSON.stringify(data.images) : data.images,
      createdAt: isLocalDB ? Date.now() : new Date(),
      updatedAt: isLocalDB ? Date.now() : new Date(),
    })
    .returning();

  const stallReviews = await withRetry(() =>
    (db as any).query.reviews.findMany({
      where: eq(reviews.stallId, data.stallId),
    })
  );

  const avgRating =
    (stallReviews as any[]).reduce((sum: number, r: any) => sum + r.rating, 0) / (stallReviews as any[]).length;

  await (db as any)
    .update(stalls)
    .set({
      avgRating: avgRating.toFixed(1),
      totalReviews: (stallReviews as any[]).length,
    })
    .where(eq(stalls.id, data.stallId));

  if (data.dishId) {
    const dishReviews = await withRetry(() =>
      (db as any).query.reviews.findMany({
        where: eq(reviews.dishId, data.dishId!),
      })
    );

    const dishAvgRating =
      (dishReviews as any[]).reduce((sum: number, r: any) => sum + r.rating, 0) / (dishReviews as any[]).length;

    await (db as any)
      .update(dishes)
      .set({
        avgRating: dishAvgRating.toFixed(1),
        totalReviews: (dishReviews as any[]).length,
      })
      .where(eq(dishes.id, data.dishId));
  }

  return c.json({ success: true, data: review }, 201);
});

app.delete('/reviews/:id', async (c) => {
  const session = await auth();

  if (!session?.user || session.user.role !== 'student') {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const reviewId = c.req.param('id');

  const review = await withRetry(() =>
    (db as any).query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
    })
  );

  if (!review) {
    return c.json({ success: false, error: '评价不存在' }, 404);
  }

  if ((review as any).studentId !== session.user.id) {
    return c.json({ success: false, error: '无权删除他人评价' }, 403);
  }

  const reviewData = review as any;

  await (db as any)
    .delete(reviewLikes)
    .where(eq(reviewLikes.reviewId, reviewId));

  await (db as any)
    .delete(reviews)
    .where(eq(reviews.id, reviewId));

  const stallReviews = await withRetry(() =>
    (db as any).query.reviews.findMany({
      where: eq(reviews.stallId, reviewData.stallId),
    })
  );

  const stallReviewsList = stallReviews as any[];
  const avgRating = stallReviewsList.length > 0
    ? stallReviewsList.reduce((sum: number, r: any) => sum + r.rating, 0) / stallReviewsList.length
    : 0;

  await (db as any)
    .update(stalls)
    .set({
      avgRating: avgRating.toFixed(1),
      totalReviews: stallReviewsList.length,
    })
    .where(eq(stalls.id, reviewData.stallId));

  if (reviewData.dishId) {
    const dishReviews = await withRetry(() =>
      (db as any).query.reviews.findMany({
        where: eq(reviews.dishId, reviewData.dishId),
      })
    );

    const dishReviewsList = dishReviews as any[];
    const dishAvgRating = dishReviewsList.length > 0
      ? dishReviewsList.reduce((sum: number, r: any) => sum + r.rating, 0) / dishReviewsList.length
      : 0;

    await (db as any)
      .update(dishes)
      .set({
        avgRating: dishAvgRating.toFixed(1),
        totalReviews: dishReviewsList.length,
      })
      .where(eq(dishes.id, reviewData.dishId));
  }

  return c.json({ success: true });
});

app.post('/reviews/:id/like', async (c) => {
  const session = await auth();

  if (!session?.user || session.user.role !== 'student') {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const reviewId = c.req.param('id');
  const studentId = session.user.id;

  const existingLike = await withRetry(() =>
    (db as any).query.reviewLikes.findFirst({
      where: and(
        eq(reviewLikes.reviewId, reviewId),
        eq(reviewLikes.studentId, studentId)
      ),
    })
  );

  if (existingLike) {
    await (db as any)
      .delete(reviewLikes)
      .where(
        and(
          eq(reviewLikes.reviewId, reviewId),
          eq(reviewLikes.studentId, studentId)
        )
      );

    await (db as any)
      .update(reviews)
      .set({ likes: sql`${reviews.likes} - 1` })
      .where(eq(reviews.id, reviewId));

    return c.json({ success: true, liked: false });
  } else {
    await (db as any).insert(reviewLikes).values({
      reviewId,
      studentId,
    });

    await (db as any)
      .update(reviews)
      .set({ likes: sql`${reviews.likes} + 1` })
      .where(eq(reviews.id, reviewId));

    return c.json({ success: true, liked: true });
  }
});

app.get('/reviews/my', async (c) => {
  const session = await auth();

  if (!session?.user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  if (session.user.role === 'merchant') {
    return c.json({ success: true, data: [] });
  }

  const data = await withRetry(() =>
    (db as any).query.reviews.findMany({
      where: eq(reviews.studentId, session.user.id),
      orderBy: desc(reviews.createdAt),
      with: {
        stall: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
        dish: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    })
  );

  const enriched = await enrichReviews(data as any[], session.user.id);

  return c.json({ success: true, data: enriched });
});

app.post('/reviews/:id/reply', async (c) => {
  const session = await auth();

  if (!session?.user || session.user.role !== 'merchant') {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const reviewId = c.req.param('id');
  const body = await c.req.json();

  const replySchema = z.object({
    reply: z.string().min(1, '回复内容不能为空'),
  });

  const result = replySchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        success: false,
        error: result.error.issues[0]?.message || '输入数据无效',
      },
      400
    );
  }

  const { reply } = result.data;

  const review = await withRetry(() =>
    (db as any).query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
      with: {
        stall: true,
      },
    })
  );

  if (!review || (review as any).stall.merchantId !== session.user.id) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  const [updated] = await (db as any)
    .update(isLocalDB ? sqliteSchema.reviews : reviews)
    .set({
      merchantReply: reply,
      repliedAt: isLocalDB ? Date.now() : new Date(),
    })
    .where(eq(reviews.id, reviewId))
    .returning();

  return c.json({ success: true, data: updated });
});
