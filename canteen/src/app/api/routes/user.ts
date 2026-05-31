import { app } from '@/lib/hono';
import { db, isLocalDB, sqliteSchema } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { withRetry } from '@/lib/retry';
import { serializeForJson } from '@/lib/db-utils';
import { toDbDate } from '@/lib/db-utils';

const updateProfileSchema = z.object({
  name: z.string().min(2, '姓名至少需要2个字符').optional(),
  avatar: z.string().optional(),
});

app.put('/user/profile', async (c) => {
  const session = await auth();

  if (!session?.user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const result = updateProfileSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      { success: false, error: result.error.issues[0]?.message || '输入数据无效' },
      400
    );
  }

  const { name, avatar } = result.data;

  if (name === undefined && avatar === undefined) {
    return c.json({ success: false, error: 'No fields to update' }, 400);
  }

  const userId = session.user.id;

  const updateData: Record<string, any> = {
    updatedAt: toDbDate(new Date(), isLocalDB),
  };

  if (name !== undefined) {
    updateData.name = name;
  }
  if (avatar !== undefined) {
    updateData.avatar = avatar;
  }

  await (db as any)
    .update(isLocalDB ? sqliteSchema.users : users)
    .set(updateData)
    .where(eq(users.id, userId));

  const updatedUser = await withRetry(() =>
    (db as any).query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
      },
    })
  );

  return c.json({ success: true, data: serializeForJson(updatedUser) });
});
