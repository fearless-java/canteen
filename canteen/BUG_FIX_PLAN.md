# Bug 修复计划与验收标准

> **生成日期**: 2026-05-31  
> **环境**: Neon PostgreSQL (flat-queen-60807318), Next.js 16 + Hono

---

## Bug 1: 点击"消息"按钮报 500 错误

### 根因分析

Neon PostgreSQL 数据库中 **不存在 `messages` 表**。Drizzle 迁移文件 `drizzle/0000_bouncy_mattie_franklin.sql` 是在 `messages`、`favorites`、`ranking_snapshots` 等表被添加到 `schema.ts` **之前**生成的，仅包含 6 张基础表（cafeterias, dishes, review_likes, reviews, stalls, users）。

当用户点击"消息"时，`GET /api/messages` 查询 `messages` 表，PostgreSQL 返回 `relation "messages" does not exist`，Hono 全局错误处理器捕获后返回 HTTP 500。

### 影响范围

| 表 | 状态 |
|----|------|
| `messages` | 缺失 |
| `favorites` | 缺失 |
| `ranking_snapshots` | 缺失 |

这意味着"收藏"功能（Bug 3）也因同一原因不可用。

### 修复方案

#### Step 1: 在 Neon PostgreSQL 中手动创建缺失的表

由于当前迁移文件不包含这些表，最佳方式是**手动执行建表 SQL**（因为 `db:push` 可能影响已有数据结构）。

```sql
-- 1. messages 表
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. favorites 表
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stall_id UUID NOT NULL REFERENCES stalls(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. ranking_snapshots 表
CREATE TABLE IF NOT EXISTS ranking_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stall_id UUID NOT NULL REFERENCES stalls(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  score DECIMAL(10, 2) NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### Step 2: 为 messages API 添加 try-catch 防护（防御性编程）

在 `src/app/api/routes/messages.ts` 中，参照 `stats.ts` 的风格（`stats.ts:31-55`），为关键查询添加 try-catch，使查询失败时优雅降级返回空数据，而非 500 错误。

#### Step 3: 重新生成迁移并添加 `IF NOT EXISTS`

确保后续 `db:generate` 能包含所有表。

### 验收标准

- [ ] `bun run db:seed` 能正常插入测试消息数据（需先修改 seed 脚本包含 messages 种子）
- [ ] 点击底部导航栏"消息"按钮，页面正常渲染，不报 500 错误
- [ ] 非登录用户看到"请先登录查看消息"提示
- [ ] 登录学生/商家后，消息列表正常展示（空列表显示"暂无消息"）
- [ ] `GET /api/messages/unread-count` 正常返回 `{ count: 0 }`
- [ ] `POST /api/favorites` 正常创建收藏记录
- [ ] `GET /api/favorites` 正常返回收藏列表

---

## Bug 2: 评价数量与实际显示数量对不上

### 根因分析

**问题 A — 种子数据硬编码了不真实的 `totalReviews`：**

`src/db/seed.ts:43` 中档口"川味小炒"的 `totalReviews: 128`，但实际只生成了 100 条评价随机分配给 21 个档口。档口详情页显示 "128条评价"，但实际只有约 4-5 条。同样问题在 `src/db/seed-local.ts` 也存在。

**问题 B — 档口详情页只显示 5 条评价：**

`src/app/api/routes/stalls.ts:99-103` 取 `hotScore` 排名前 5 条作为 `recentReviews` 返回。页面标题显示 `stall.totalReviews`（可能是 128），但列表最多 5 条，用户看到数字对不上。

**问题 C — 菜品详情页只显示 10 条评价：**

`src/app/api/routes/dishes.ts:94` 硬编码 `limit: 10`。标题显示 `dish.totalReviews`（种子数据硬编码），但列表最多 10 条。

**问题 D — 评分分布只基于 5 条评价：**

`src/components/stall/RatingDistribution.tsx` 接收 `recentReviews`（最多 5 条）来计算 1-5 星分布，不能代表真实评分分布。

### 修复方案

#### Step 1: 修正种子数据，按实际评价数计算 `totalReviews`

修改 `src/db/seed.ts`，在插入评价后**重新计算**每个档口和每道菜品的实际评价数和平均分，并 UPDATE 回数据库（参照 `seed-local.ts:179-189` 的方式）：

```typescript
// 示例：重新计算每个 stall 的统计数据
for (const stall of stallList) {
  const stallReviews = reviewList.filter(r => r.stallId === stall.id);
  const avgRating = stallReviews.reduce((sum, r) => sum + r.rating, 0) / stallReviews.length;
  // UPDATE stalls SET avgRating, totalReviews
}
```

同样逻辑应用于 `dishes` 表。

#### Step 2: 为全部评价页传递全部评价用于评分分布

在 `stalls/[id]/reviews/page.tsx`（全部评价页）中，`RatingDistribution` 应使用**全部评价**而非仅 5 条。

在档口详情页（`stalls/[id]/page.tsx`），由于 API 只返回 5 条，要么：
- 新增一个独立的 `GET /api/stalls/:id/rating-distribution` 端点返回完整分布数据
- 或者在 API 响应中额外包含 `ratingDistribution` 字段

#### Step 3: 菜品详情页标题与实际列表数量对齐

`src/app/dishes/[id]/page.tsx:198` 显示 `{dish.totalReviews}条评价` 而非 `{reviews.length}条`，改为动态计数。

### 验收标准

- [ ] 档口详情页标题显示的"N条评价"与数据库 `stalls.totalReviews` 一致（种子数据经过重新计算）
- [ ] "查看全部 N 条评价"链接显示的 N 与实际评价总数一致
- [ ] 全部评价页 `stalls/[id]/reviews` 实际显示的列表条目数与标题"共 N 条评价"一致
- [ ] 菜品详情页评价数量标签与实际显示的列表条目数一致
- [ ] 评分分布统计基于**全部评价**（而非仅最新 5 条）
- [ ] 种子数据重新执行后，每个档口的 `totalReviews` ≈ 4-5（约 100 条评价 / 21 个档口）

---

## Bug 3: 收藏功能失效

### 根因分析

与 Bug 1 相同：Neon PostgreSQL 数据库中**不存在 `favorites` 表**。所有 favorites API 端点（`POST`, `DELETE`, `GET /check`, `GET /favorites`）都会因 `relation "favorites" does not exist` 报错。

另外，`src/app/stalls/[id]/page.tsx:357` 中 `isFavorited` 初始状态为 `false`，若 API 调用失败则永远不更新，用户看到的心形图标始终未激活。

### 修复方案

#### Step 1: 创建 favorites 表（与 Bug 1 合并处理）

见 Bug 1 修复方案 Step 1。

#### Step 2: 添加 `(user_id, stall_id)` 唯一索引（防竞态条件）

```sql
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_stall_idx ON favorites(user_id, stall_id);
```

并在 `src/db/schema.ts` 和 `src/db/schema.sqlite.ts` 中添加对应的唯一约束。

#### Step 3: 前端收藏状态改为由查询驱动

移除 `useState(false)` 的初始值设置，改为 `isFavorited` 完全由 `useQuery` 的 `favorites/check` 结果驱动。在数据加载完成前显示 loading 态，避免误导用户。

### 验收标准

- [ ] 档口详情页心形图标能正确展示当前收藏状态
- [ ] 点击心形图标能成功收藏/取消收藏
- [ ] 乐观更新响应及时（点击后图标立即变化）
- [ ] 收藏/取消收藏后，`POST/DELETE /api/favorites` 返回正确状态
- [ ] 个人中心 → 我的收藏 页面能正确显示已收藏的档口列表
- [ ] 个人中心首页"我的收藏"数量与实际一致
- [ ] 首页档口列表已收藏的档口显示红色实心心形

---

## Bug 4: 商家后台总浏览量始终为 0

### 根因分析

**问题 A — 浏览量递增使用了错误的 schema 引用：**

`src/app/api/routes/stalls.ts:54-57` 中的浏览量 `+1` 操作：

```typescript
await (db as any)
  .update(stalls)  // 始终使用 @/db/schema 的 pg stalls
  .set({ totalViews: (stall as any).totalViews + 1 })
  .where(eq(stalls.id, id));
```

对比同一文件中 PUT handler（第 161-164 行）正确地做了 `isLocalDB` 判断：

```typescript
await (db as any)
  .update(isLocalDB ? sqliteSchema.stalls : stalls)  // 正确
  .set(updateData)
  .where(eq(stalls.id, id));
```

**问题 B — 种子数据不设置 `totalViews`（PostgreSQL）：**

`src/db/seed.ts` 的 stallData（第 42-70 行）不含 `totalViews` 字段，依赖数据库默认值 `0`。对比 `src/db/seed-local.ts:185-189` 会随机生成 50~500 的浏览数。

**问题 C — read-modify-write 竞态条件：**

```typescript
.set({ totalViews: (stall as any).totalViews + 1 })
```

这不是原子操作，高并发时计数偏低。应使用 SQL 原子自增。

**问题 D — API 返回的是增量前的旧值：**

第 39-56 行先查询再更新，返回的是更新前的 stall 数据，页面看到的 `totalViews` 是本页访问计数之前的值。

### 修复方案

#### Step 1: 浏览量递增改用 `isLocalDB` 判断 + 原子自增

```typescript
// src/app/api/routes/stalls.ts
const targetStalls = isLocalDB ? sqliteSchema.stalls : stalls;

if (isLocalDB) {
  await (db as any)
    .update(targetStalls)
    .set({ totalViews: sql`total_views + 1` })
    .where(eq(targetStalls.id, id));
} else {
  // PostgreSQL: 使用原生 SQL 原子自增
  await executeSQL(db, `UPDATE stalls SET total_views = total_views + 1 WHERE id = '${id}'`);
}
```

#### Step 2: 种子数据添加随机浏览量

修改 `src/db/seed.ts`，为每个 stall 添加 `totalViews: Math.floor(Math.random() * 450) + 50`。

#### Step 3: /merchant/stats 返回递增后的值

由于使用原子 SQL 自增后不再有 read-modify-write 问题，API 返回的值即包含本次访问计数。

### 验收标准

- [ ] 访问档口详情页 `GET /api/stalls/:id` 后，数据库中对应 stall 的 `total_views` +1
- [ ] 商家打开数据看板 `/merchant`，"总浏览量"数值 > 0（种子数据有基础值）
- [ ] 多次访问同一档口，浏览量持续增加
- [ ] 商家档口管理页 `/merchant/stall` 浏览量显示正确
- [ ] 种子数据执行后，所有档口 `totalViews` 在 50~500 之间随机分布

---

## Bug 5: 评论区（菜品详情页）没有点赞功能

### 根因分析

菜品详情页 `src/app/dishes/[id]/page.tsx` 中的 `ReviewItem` 组件（第 60-113 行）**完全没有点赞交互逻辑**。

对比档口详情页的 `ReviewItem`（`stalls/[id]/page.tsx:161-345`）有完整的：
- `isLiked` / `likeCount` / `liking` 状态管理
- `handleLike` 乐观更新
- 点赞图标切换（空心/实心）
- 权限控制（仅 student 可操作）

菜品详情页仅显示静态文本 `👍 {review.likes}`（第 108-110 行），不可交互。

### 修复方案

#### Step 1: 为菜品详情页 ReviewItem 添加点赞功能

参照 `stalls/[id]/page.tsx:161-345` 的 `ReviewItem` 组件实现，在 `dishes/[id]/page.tsx:60-113` 中添加：

1. 导入 `ThumbsUp` 图标和 `useMutation`
2. 添加 `isLiked`、`likeCount`、`liking` 状态
3. 实现 `handleLike` 函数（乐观更新 + 回滚）
4. 发送 `POST /api/reviews/${review.id}/like`（该端点已存在于 `reviews.ts:229-277`）
5. 权限控制：仅 `student` 角色可点击，`merchant` 和非登录用户仅查看

#### Step 2 (可选): 统一两处的点赞图标

档口详情页使用 `ThumbsUp`，全部评价页使用 `Heart`。考虑统一为 `Heart`（更符合"收藏/喜欢"语义）或保持差异化（点赞 vs 收藏）。

### 验收标准

- [ ] 菜品详情页评价列表中每条评价显示可点击的点赞按钮
- [ ] 点击点赞按钮后，点赞数 +1，图标变为实心
- [ ] 再次点击取消点赞，点赞数 -1，图标变为空心
- [ ] 未登录用户看到点赞数但不可点击
- [ ] 商家角色看到点赞数但不可点击
- [ ] 学生角色点赞前后端数据一致（`review_likes` 表正确记录）
- [ ] 页面刷新后点赞状态保持
- [ ] 乐观更新无闪烁（点击后即时响应）

---

## 执行优先级

| 优先级 | Bug | 理由 |
|--------|-----|------|
| **P0** | Bug 1 + Bug 3（合并修复）| 缺失数据库表，收藏和消息功能完全不可用 |
| **P1** | Bug 4 | 商家后台核心数据展示错误 |
| **P2** | Bug 2 | 数据展示不一致，影响用户信任 |
| **P3** | Bug 5 | 功能缺失（菜品详情页缺少点赞），影响完整性 |

### 建议执行顺序

1. 先执行 Bug 1 的 Step 1（手动创建 3 张缺失表）—— 这是所有后续修复的基础
2. 执行 Bug 3 的 Step 2（添加唯一索引）
3. 执行 Bug 1 的 Step 2（API 防御性编程）和 Bug 3 的 Step 3（前端状态修复）
4. 执行 Bug 4 的 Step 1-3（浏览量递增修复 + 种子数据）
5. 执行 Bug 2 的 Step 1-3（评价计数修复 + 种子重新计算）
6. 执行 Bug 5 的 Step 1（菜品详情页点赞功能）
7. 全部修复后重新 `db:seed` 验证
