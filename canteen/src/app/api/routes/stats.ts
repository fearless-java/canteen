import { app } from '@/lib/hono';
import { db } from '@/db';
import { reviews, favorites, messages } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { withRetry } from '@/lib/retry';

app.get('/stats/my', async (c) => {
  const session = await auth();

  if (!session?.user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const userId = session.user.id as string;

  let reviewCount = 0;
  let favoriteCount = 0;
  let unreadMessages = 0;

  try {
    const reviewResult = await withRetry(() =>
      (db as any)
        .select({ count: sql<number>`count(*)` })
        .from(reviews)
        .where(eq(reviews.studentId, userId))
    ) as any[];
    reviewCount = reviewResult[0]?.count || 0;
  } catch (e) {
    console.error('Error getting review count:', e);
  }

  try {
    const favoriteResult = await withRetry(() =>
      (db as any)
        .select({ count: sql<number>`count(*)` })
        .from(favorites)
        .where(eq(favorites.userId, userId))
    ) as any[];
    favoriteCount = favoriteResult[0]?.count || 0;
  } catch (e) {
    console.error('Error getting favorite count:', e);
  }

  try {
    const messageResult = await withRetry(() =>
      (db as any)
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(eq(messages.userId, userId), eq(messages.isRead, false)))
    ) as any[];
    unreadMessages = messageResult[0]?.count || 0;
  } catch (e) {
    console.error('Error getting unread messages:', e);
  }

  return c.json({
    success: true,
    data: {
      reviews: reviewCount,
      favorites: favoriteCount,
      unreadMessages: unreadMessages,
    },
  });
});
