# 消息模块 Bug 分析与完整修复/重构方案

## 一、问题描述

"消息"页面始终显示「暂无消息」。根据需求重构消息系统，使其支持完整的通知功能。

## 二、需求概述

1. **BottomNav 消息徽章**：消息按钮右上角红色圆球 + 未读计数（>99 显示 99+）
2. **消息类型**：按时间顺序展示所有用户相关消息
   - 学生端：商家回复评价、其他用户点赞评价
3. **消息展示格式**：用户头像 + 名称 + 行为描述（如「张老板 回复了你的评价」）+ 日期
4. **点击跳转**：每条消息点击后直接跳转到对应页面（如档口/菜品/评价详情）

---

## 三、数据库 Schema 变更

### 3.1 当前 messages 表结构

```
id, userId, type, title, content, isRead, createdAt
```

**问题**：

- 没有存储「谁触发了这条消息」（actorId/actorName/actorAvatar）
- 没有存储跳转目标信息（linkType/linkId）
- 前端需要额外查询才能获取头像和名称

### 3.2 新增字段

在 `messages` 表中添加以下字段：

| 字段          | PostgreSQL 类型                | SQLite 类型            | 说明                                           |
| ------------- | ------------------------------ | ---------------------- | ---------------------------------------------- |
| `actorId`     | `uuid('actor_id')`             | `text('actor_id')`     | 触发消息的用户 ID（可为空，系统消息无 actor）  |
| `actorName`   | `varchar('actor_name', 100)`   | `text('actor_name')`   | 触发消息的用户名称（快照，不随用户改名而变）   |
| `actorAvatar` | `varchar('actor_avatar', 500)` | `text('actor_avatar')` | 触发消息的用户头像                             |
| `linkType`    | `varchar('link_type', 50)`     | `text('link_type')`    | 跳转类型：`stall` / `dish` / `review` / `null` |
| `linkId`      | `uuid('link_id')`              | `text('link_id')`      | 跳转目标的 ID                                  |

#### 消息 type 枚举

```
review_reply   — 商家回复了你的评价
review_like    — 有人点赞了你的评价
system         — 系统通知
```

---

## 四、波及文件清单（共 10 个文件）

| #   | 文件                                  | 修改内容                  |
| --- | ------------------------------------- | ------------------------- |
| 1   | `src/db/schema.ts`                    | messages 表新增 5 个字段  |
| 2   | `src/db/schema.sqlite.ts`             | messages 表新增 5 个字段  |
| 3   | `src/db/init-local.ts`                | 建表 SQL 新增 5 列        |
| 4   | `src/db/sync.ts`                      | 迁移脚本适配新字段        |
| 5   | `src/app/api/routes/reviews.ts`       | 回复 + 点赞时创建消息     |
| 6   | `src/app/api/routes/messages.ts`      | 返回消息时关联 actor 信息 |
| 7   | `src/components/layout/BottomNav.tsx` | 消息图标添加未读徽章      |
| 8   | `src/app/messages/page.tsx`           | 消息列表 UI 重构          |
| 9   | `src/db/seed.ts`                      | 种子数据适配新字段        |
| 10  | `src/db/seed-local.ts`                | 种子数据适配新字段        |

---

## 五、详细修改步骤

### 步骤 1：数据库 Schema（schema.ts）

**文件**：`src/db/schema.ts`

在 `messages` 表定义（第101-109行）中添加 5 个新字段：

```typescript
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  actorId: uuid("actor_id"),
  actorName: varchar("actor_name", { length: 100 }),
  actorAvatar: varchar("actor_avatar", { length: 500 }),
  linkType: varchar("link_type", { length: 50 }),
  linkId: uuid("link_id"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

### 步骤 2：数据库 Schema（schema.sqlite.ts）

**文件**：`src/db/schema.sqlite.ts`

```typescript
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  actorId: text("actor_id"),
  actorName: text("actor_name"),
  actorAvatar: text("actor_avatar"),
  linkType: text("link_type"),
  linkId: text("link_id"),
  isRead: integer("is_read", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at").notNull(),
});
```

---

### 步骤 3：SQLite 建表语句（init-local.ts）

**文件**：`src/db/init-local.ts`，约第110-120行

```sql
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT,
  actor_avatar TEXT,
  link_type TEXT,
  link_id TEXT,
  is_read INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);
```

---

### 步骤 4：数据库迁移脚本（sync.ts）

**文件**：`src/db/sync.ts`，约第149-155行

迁移时需携带新字段，修改为：

```typescript
for (const item of data.messages) {
  sqliteDb
    .insert(sqliteSchema.messages)
    .values({
      ...item,
      actorAvatar: item.actorAvatar || null,
      linkType: item.linkType || null,
      linkId: item.linkId || null,
      createdAt: new Date(item.createdAt),
    })
    .run();
}
```

[!NOTE]
**生产环境迁移**：需要运行 `bun run db:generate` 生成 Drizzle 迁移文件，然后 `bun run db:migrate` 执行迁移。新增字段全部为可选（nullable），不会影响已有数据。

---

### 步骤 5：创建消息通知——商家回复评价

**文件**：`src/app/api/routes/reviews.ts`

**(a)** 文件顶部第3行，导入中加入 `messages`：

```typescript
import { reviews, stalls, dishes, reviewLikes, messages } from "@/db/schema";
```

**(b)** 在 `POST /reviews/:id/reply` 的 `return c.json(...)` 之前（约第365行），插入消息创建逻辑：

```typescript
// 为被回复的学生创建消息通知
const stallName = (review as any).stall?.name || "档口";
const actorName = session.user.name || "商家";
await (db as any).insert(isLocalDB ? sqliteSchema.messages : messages).values({
  id: crypto.randomUUID(),
  userId: (review as any).studentId,
  type: "review_reply",
  title: `${stallName} 回复了你的评价`,
  content: reply,
  actorId: session.user.id,
  actorName,
  actorAvatar: session.user.avatar || null,
  linkType: "review",
  linkId: reviewId,
  isRead: false,
  createdAt: isLocalDB ? Date.now() : new Date(),
});
```

---

### 步骤 6：创建消息通知——用户点赞评价

**文件**：`src/app/api/routes/reviews.ts`

在 `POST /reviews/:id/like` 中，当 `liked === true`（点赞）时创建消息。在 `return c.json({ success: true, liked: true })` 之前（约第299行），插入：

```typescript
// ---- 在 Liked === true 分支中插入 ----
// 获取被点赞的评价信息
const likedReview = await withRetry(() =>
  (db as any).query.reviews.findFirst({
    where: eq(reviews.id, reviewId),
    with: {
      student: { columns: { id: true, name: true } },
      stall: { columns: { id: true, name: true } },
      dish: { columns: { id: true, name: true } },
    },
  }),
);

// 只有点赞的不是自己的评价时才发送通知
if (likedReview && (likedReview as any).student.id !== session.user.id) {
  const reviewData = likedReview as any;
  const targetName =
    reviewData.dish?.name || reviewData.stall?.name || "你的评价";
  const actorName = session.user.name || "同学";
  await (db as any)
    .insert(isLocalDB ? sqliteSchema.messages : messages)
    .values({
      id: crypto.randomUUID(),
      userId: reviewData.student.id,
      type: "review_like",
      title: `${actorName} 点赞了${targetName}`,
      content: "",
      actorId: session.user.id,
      actorName,
      actorAvatar: session.user.avatar || null,
      linkType: "stall",
      linkId: reviewData.stall.id,
      isRead: false,
      createdAt: isLocalDB ? Date.now() : new Date(),
    });
}
```

[!IMPORTANT]
点赞是高频操作，可能造成大量消息。建议在 `review_like` 的消息创建逻辑外层加 `try/catch`，失败时静默忽略（`console.error` 记录即可），避免因消息插入失败导致点赞操作回滚。

---

### 步骤 7：消息 API 适配

**文件**：`src/app/api/routes/messages.ts`

`GET /api/messages` 无需调整 — 直接返回 messages 表数据即可，因为 actorName/actorAvatar 已经存储在消息中。

但需要修改错误处理（第24-27行和第50-53行），不再静默返回空数据：

```typescript
// 第24行 catch 改为：
} catch (error) {
  console.error('Failed to fetch messages:', error);
  return c.json({ success: false, error: '获取消息失败，请稍后重试' }, 500);
}

// 第50行 catch 改为：
} catch (error) {
  console.error('Failed to fetch unread count:', error);
  return c.json({ success: false, error: '获取未读消息数失败' }, 500);
}
```

---

### 步骤 8：BottomNav 未读徽章

**文件**：`src/components/layout/BottomNav.tsx`

完整重写为：

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/trending", label: "搜索", icon: Search },
  { href: "/messages", label: "消息", icon: MessageCircle },
  { href: "/profile", label: "我的", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["messages", "unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/messages/unread-count");
      const json = await res.json();
      return json.data || { count: 0 };
    },
    enabled: !!session?.user,
    refetchInterval: 30000, // 每30秒轮询一次
  });

  const unreadCount = unreadData?.count || 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EEEEEE] z-50 safe-area-pb">
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-all duration-200 relative",
                isActive ? "text-black" : "text-gray-400 hover:text-gray-600",
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-[22px] h-[22px] transition-all duration-200",
                    isActive && "stroke-[2.5px]",
                  )}
                />
                {item.href === "/messages" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[11px] mt-0.5 transition-all duration-200",
                  isActive ? "font-semibold" : "font-normal",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

---

### 步骤 9：消息列表页 UI 重构

**文件**：`src/app/messages/page.tsx`

重新设计每条消息的展示格式，核心变化：

- 显示 actor 头像（使用 `getDefaultAvatar` 作为默认头像）
- 显示 actor 名称 + 行为描述（通过 `getActionText` 函数）
- 点击跳转到 `linkType` + `linkId` 对应的页面
- 保留未读标记、已读、删除功能

```tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  Bell,
  MessageCircle,
  Heart,
  Check,
  Trash2,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDefaultAvatar } from "@/lib/utils";

interface MessageData {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  actorId: string | null;
  actorName: string | null;
  actorAvatar: string | null;
  linkType: string | null;
  linkId: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery<MessageData[]>({
    queryKey: ["messages"],
    queryFn: async () => {
      const res = await fetch("/api/messages");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session?.user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/messages/${messageId}/read`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["stats", "my"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/messages/read-all", {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["stats", "my"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["stats", "my"] });
    },
  });

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "review_reply":
        return <MessageCircle className="w-4 h-4 text-[#D97706]" />;
      case "review_like":
        return <Heart className="w-4 h-4 text-red-500" />;
      case "system":
        return <Bell className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionText = (message: MessageData) => {
    switch (message.type) {
      case "review_reply":
        return (
          <>
            <span className="font-semibold text-black">
              {message.actorName || "商家"}
            </span>{" "}
            回复了你的评价
          </>
        );
      case "review_like":
        return (
          <>
            <span className="font-semibold text-black">
              {message.actorName || "同学"}
            </span>{" "}
            点赞了
          </>
        );
      case "system":
        return <span className="text-gray-500">系统通知</span>;
      default:
        return <span className="text-gray-500">{message.title}</span>;
    }
  };

  const getLinkPath = (message: MessageData): string | null => {
    if (!message.linkType || !message.linkId) return null;
    switch (message.linkType) {
      case "stall":
        return `/stalls/${message.linkId}`;
      case "dish":
        return `/dishes/${message.linkId}`;
      case "review":
        return `/stalls/${message.linkId}#reviews`;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    return date.toLocaleDateString("zh-CN", {
      month: "long",
      day: "numeric",
    });
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 pb-20">
        <div className="w-20 h-20 bg-[#F8F8F8] rounded-full flex items-center justify-center mb-6">
          <Bell className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-500 mb-6">请先登录查看消息</p>
        <BottomNav />
      </div>
    );
  }

  const unreadCount = messages?.filter((m) => !m.isRead).length || 0;

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="px-4 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
        <h1 className="text-lg font-bold text-black">消息</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="text-sm text-[#D97706] font-medium disabled:opacity-50"
          >
            全部已读
          </button>
        )}
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#D97706] animate-spin" />
        </div>
      ) : messages && messages.length > 0 ? (
        <div className="divide-y divide-[#F0F0F0]">
          <AnimatePresence>
            {messages.map((message) => {
              const linkPath = getLinkPath(message);
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative"
                >
                  <div
                    onClick={async () => {
                      if (!message.isRead) {
                        await markAsReadMutation.mutateAsync(message.id);
                      }
                      if (linkPath) {
                        router.push(linkPath);
                      }
                    }}
                    className={`px-4 py-3.5 active:bg-[#F8F8F8] transition-colors cursor-pointer ${
                      !message.isRead ? "bg-[#FFF8ED]" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Actor 头像 */}
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[#F8F8F8]">
                        {message.actorAvatar ? (
                          <img
                            src={message.actorAvatar}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={getDefaultAvatar(
                              message.actorId || message.id,
                            )}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          {/* 行为描述 */}
                          <p className="text-[15px] text-gray-700 truncate">
                            {getActionText(message)}
                          </p>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>

                        {/* 消息摘要（回复内容等） */}
                        {message.content && (
                          <p className="text-sm text-gray-500 line-clamp-1">
                            {message.content}
                          </p>
                        )}

                        {/* 消息图标 */}
                        <div className="flex items-center gap-1 mt-1">
                          {getMessageIcon(message.type)}
                          <span className="text-xs text-gray-400">
                            {message.title}
                          </span>
                        </div>
                      </div>

                      {/* 未读标记 */}
                      {!message.isRead && (
                        <div className="w-2 h-2 bg-[#D97706] rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {!message.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsReadMutation.mutate(message.id);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full"
                      >
                        <Check className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(message.id);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 bg-[#F8F8F8] rounded-full flex items-center justify-center mb-6"
          >
            <Bell className="w-10 h-10 text-gray-400" />
          </motion.div>
          <h2 className="text-lg font-bold text-black mb-2">暂无消息</h2>
          <p className="text-[15px] text-gray-500 text-center">
            商家回复和系统通知将显示在这里
          </p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
```

---

### 步骤 10：种子数据更新

**文件**：`src/db/seed.ts`、`src/db/seed-local.ts`

添加为前两个学生创建示例消息（一条 `review_reply` + 一条 `review_like` + 一条 `system`）。

**seed.ts**（PostgreSQL）：

```typescript
// 文件中添加导入
import { cafeterias, stalls, dishes, users, reviews, messages } from "./schema";

// 在文件末尾 console.log('✅ Seeding completed!') 之前添加：
const messageData = students.slice(0, 2).flatMap((student, i) => [
  {
    userId: student.id,
    type: "review_reply",
    title: "川味小炒 回复了你的评价",
    content: "感谢你的好评！我们会继续努力的~",
    actorId: merchants[0].id,
    actorName: merchants[0].name,
    actorAvatar: merchants[0].avatar || null,
    linkType: "review",
    linkId: "00000000-0000-0000-0000-000000000000", // 占位，实际运行时需替换为真实 reviewId
    isRead: i === 0,
    createdAt: new Date(Date.now() - 3600000 * (i + 1)),
  },
  {
    userId: student.id,
    type: "review_like",
    title: `${students[(i + 1) % 5].name} 点赞了`,
    content: "",
    actorId: students[(i + 1) % 5].id,
    actorName: students[(i + 1) % 5].name,
    actorAvatar: null,
    linkType: "stall",
    linkId: insertedStalls[0].id,
    isRead: false,
    createdAt: new Date(Date.now() - 7200000 * (i + 1)),
  },
  {
    userId: student.id,
    type: "system",
    title: "欢迎加入校园食堂",
    content:
      "欢迎使用校园食堂！在这里你可以探索美食、分享评价、收藏你喜欢的档口。",
    actorId: null,
    actorName: null,
    actorAvatar: null,
    linkType: null,
    linkId: null,
    isRead: true,
    createdAt: new Date(Date.now() - 86400000 * (i + 1)),
  },
]);
await db.insert(messages).values(messageData);
console.log(`✅ Inserted ${messageData.length} messages`);
```

**seed-local.ts**（SQLite）：同理，使用 `generateUUID()` 生成 id，时间戳使用 `nowMs`。

---

## 六、验证标准

### 6.1 功能验证

| #   | 验证项                   | 操作步骤                                                  | 预期结果                                                        |
| --- | ------------------------ | --------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | **BottomNav 未读徽章**   | 以有未读消息的学生登录                                    | 底部导航「消息」图标右上角显示红色圆球，球内显示未读数字        |
| 2   | **超过99显示99+**        | 创建100+条未读消息                                        | 徽章显示「99+」                                                 |
| 3   | **无未读时不显示徽章**   | 全部标记已读后                                            | 徽章消失                                                        |
| 4   | **商家回复生成消息**     | 商家登录 → 进入自己的档口 → 回复一条学生评价 → 该学生登录 | 学生消息列表中出现「张老板 回复了你的评价」，content 为回复内容 |
| 5   | **点赞生成消息**         | 学生A登录 → 进入档口 → 点赞学生B的评价 → 学生B登录        | 学生B收到「小明 点赞了」消息                                    |
| 6   | **点赞自己不生成消息**   | 学生A点赞自己的评价                                       | 不产生消息通知                                                  |
| 7   | **消息展示格式**         | 查看消息列表中的每条消息                                  | 每条消息显示：头像 + 名称 + 行为描述 + 日期 + 摘要              |
| 8   | **点击跳转（回复消息）** | 点击「商家回复了你的评价」消息                            | 跳转到对应档口页面 `#reviews` 锚点位置                          |
| 9   | **点击跳转（点赞消息）** | 点击「点赞了」消息                                        | 跳转到对应档口页面                                              |
| 10  | **未读标记**             | 查看未读消息                                              | 未读消息背景为淡橙色 (`bg-[#FFF8ED]`)，右侧有橙色圆点           |
| 11  | **标记已读**             | 点击未读消息进入目标页                                    | 返回消息列表时该消息不再有未读标记                              |
| 12  | **全部已读**             | 有多条未读时点击「全部已读」                              | 所有消息标记为已读，徽章消失                                    |
| 13  | **删除消息**             | 点击消息右侧删除按钮                                      | 消息从列表中移除                                                |
| 14  | **种子数据可见**         | 执行 `bun run db:seed` 后以学生身份登录                   | 消息页面显示种子消息                                            |
| 15  | **数据库迁移**           | 执行 `bun run db:generate && bun run db:migrate`          | 迁移成功，现有数据不受影响（新字段为 nullable）                 |

### 6.2 边界条件验证

| #   | 验证项            | 操作步骤                                                       | 预期结果                                                 |
| --- | ----------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| 16  | **空消息状态**    | 以无消息的新用户登录                                           | 显示「暂无消息」空状态                                   |
| 17  | **未登录访问**    | 退出登录后访问 `/messages`                                     | 显示「请先登录查看消息」                                 |
| 18  | **SQLite 兼容性** | `DB_PROVIDER=local bun run db:seed:local && bun run dev:local` | 所有消息功能与 PostgreSQL 模式一致                       |
| 19  | **大量消息**      | 插入100+条消息                                                 | 列表正常滚动，无性能问题                                 |
| 20  | **actor 已删除**  | 触发消息的用户账号被删除                                       | 消息仍正常显示（actorName 存为快照），头像回退到默认头像 |

### 6.3 回归验证

| #   | 验证项                 | 操作步骤          | 预期结果           |
| --- | ---------------------- | ----------------- | ------------------ |
| 21  | **回复评价功能正常**   | 商家回复评价      | 回复正常保存并显示 |
| 22  | **点赞功能正常**       | 学生点赞/取消点赞 | 点赞数正常增减     |
| 23  | **首页/档口/个人中心** | 正常浏览各页面    | 功能不受影响       |

---

## 七、执行优先级

| 优先级 | 步骤    | 说明                                            |
| ------ | ------- | ----------------------------------------------- |
| **P0** | 步骤1-4 | 数据库 Schema 变更 + 迁移（所有后续步骤的基础） |
| **P0** | 步骤5   | 商家回复创建消息（核心功能）                    |
| **P0** | 步骤9   | 消息列表 UI 重构（用户可见的改动）              |
| **P0** | 步骤8   | BottomNav 未读徽章（用户可见的改动）            |
| **P1** | 步骤6   | 点赞创建消息（增强功能）                        |
| **P1** | 步骤7   | API 错误处理修复                                |
| **P2** | 步骤10  | 种子数据更新                                    |

---

## 八、风险提示

1. **Schema 变更需要数据库迁移**：新增字段为 nullable，对现有数据无影响，但需要生成并执行迁移文件。
2. **点赞通知频率**：点赞是高频操作，每条赞都会生成一条消息。如果用户评价很受欢迎，可能产生大量通知。后续可考虑「合并通知」（如「小明等3人赞了你的评价」）。
3. **SQLite 和 PostgreSQL 双重维护**：所有修改都需要同时适配两个 schema 文件。
4. **消息详情页弃用**：重构后消息点击直接跳转到目标页面，`/messages/[id]` 详情页不再需要，但可保留用于兼容。
