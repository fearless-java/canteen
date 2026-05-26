import { app } from '@/lib/hono';
import { querySQL } from '@/db';
import { auth } from '@/lib/auth';

app.get('/stats/my', async (c) => {
  const session = await auth();

  if (!session?.user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const userId = session.user.id as string;

  // 使用原生 SQL 查询
  let reviewCount = 0;
  let favoriteCount = 0;
  let unreadMessages = 0;

  try {
    const reviewResult: any[] = await querySQL(
      'SELECT COUNT(*) as count FROM reviews WHERE student_id = ?',
      [userId]
    );
    reviewCount = reviewResult[0]?.count || 0;
  } catch (e) {
    console.error('Error getting review count:', e);
  }

  try {
    const favoriteResult: any[] = await querySQL(
      'SELECT COUNT(*) as count FROM favorites WHERE user_id = ?',
      [userId]
    );
    favoriteCount = favoriteResult[0]?.count || 0;
  } catch (e) {
    console.error('Error getting favorite count:', e);
  }

  try {
    const messageResult: any[] = await querySQL(
      'SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND is_read = 0',
      [userId]
    );
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
