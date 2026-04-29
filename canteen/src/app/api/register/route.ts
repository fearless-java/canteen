import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符'),
  name: z.string().min(2, '姓名至少需要2个字符'),
  role: z.enum(['student', 'merchant']),
  avatar: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || '输入数据无效' },
        { status: 400 }
      );
    }

    const { email, password, name, role, avatar } = result.data;

    const existingUser = await (db as any)
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [user] = await (db as any).insert(users).values({
      email,
      password: hashedPassword,
      name,
      role,
      avatar: avatar || null,
    }).returning();

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
