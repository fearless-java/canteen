# 项目问题分析与解决思路

## 问题 1：图片上传和展示

### 现状

| 模块 | 状态 |
|------|------|
| 后端上传 API (`POST /api/upload/image`) | 已实现，本地文件存储，限 JPEG/PNG/WebP，最大 5MB |
| 后端图片服务 (`GET /api/uploads/:filename`) | 已实现，带 1 年缓存头 |
| 前端 ImageUpload 组件 | 已实现，支持多图上传、缩略图预览、删除，仅在评价创建页 (`/reviews/new`) 使用 |
| 商家档口图片输入 | 纯文本输入框，未使用上传组件 (`merchant/stall/page.tsx:32`) |
| 商家菜品图片输入 | 纯文本输入框，未使用上传组件 (`merchant/dishes/page.tsx:41`) |
| 用户头像上传 | 未实现，注册/登录不涉及头像，始终使用 `getDefaultAvatar()` 生成默认 SVG |
| 评价图片在详情页展示 | 档口详情页、菜品详情页的评价列表不展示评价图片 |
| 存储方式 | 本地 `./uploads/` 目录，Vercel 无服务器部署下不可持久化 |
| next/image | 未使用，所有图片使用原生 `<img>` 标签 |

### 涉及文件

- `src/app/api/routes/upload.ts` — 上传 API
- `src/app/api/routes/uploads.ts` — 图片服务 API
- `src/components/common/ImageUpload.tsx` — 上传组件
- `src/app/reviews/new/page.tsx` — 唯一使用 ImageUpload 的页面
- `src/app/merchant/stall/page.tsx` — 档口管理（图片为文本输入框）
- `src/app/merchant/dishes/page.tsx` — 菜品管理（图片为文本输入框）
- `src/app/profile/page.tsx` — 个人资料页（无头像上传）
- `src/app/stalls/[id]/page.tsx` — 档口详情（评价图片未展示）
- `src/app/dishes/[id]/page.tsx` — 菜品详情（评价图片未展示）
- `src/app/merchant/reviews/page.tsx` — 商家评价管理（评价图片未展示）
- `src/lib/utils.ts` — `getDefaultAvatar()` 函数

### 解决思路

1. **商家端图片输入替换为上传组件**：在档口管理和菜品管理表单中，将 `image` 文本输入框替换为 `ImageUpload` 组件（`maxImages={1}` 单图模式）。需要扩展 `ImageUpload` 支持单图模式或新增 `maxImages` 参数限制。

2. **用户头像上传**：在个人资料页或设置页添加上传入口，上传后更新 `users.avatar` 字段。同时在 `src/lib/auth.ts` 的 JWT/session callback 中将 `avatar` 写入 session，使全局可用。

3. **评价图片展示补全**：
   - 档口详情页 (`stalls/[id]/page.tsx`)：在评价列表中渲染 `review.images` 缩略图
   - 菜品详情页 (`dishes/[id]/page.tsx`)：同上
   - 商家评价管理 (`merchant/reviews/page.tsx`)：同上

4. **引入 next/image 优化**：将所有 `<img>` 替换为 `next/image`，配置 `remotePatterns` 或本地 `uploads` 目录路径，获得响应式、懒加载、格式优化。

5. **存储升级（可选，部署时必要）**：若需部署到 Vercel，将本地 `uploads/` 替换为对象存储（Cloudflare R2 / S3 兼容 API），上传时返回云 URL。可使用 `@aws-sdk/client-s3` 或 `@vercel/blob`。

---

## 问题 2：每日档口排名自动更新

### 现状

| 模块 | 状态 |
|------|------|
| 排名计算函数 `calculateStallScore()` | 已实现，基于 avgRating、totalReviews、totalViews 的对数加权算法，已导出但未在其他模块复用 |
| 排名 API (`GET /api/stalls/ranked`) | 已实现，每次请求实时计算所有档口分数并排序，支持按食堂筛选 |
| `ratingChange` 字段 | 始终硬编码为 `0`，首页排名变化徽章始终显示"持平" |
| 首页副标题 | 显示"今日评分较昨日变化"，与实际逻辑不符 |
| 历史快照表 | 不存在，无法计算评分/排名变化 |
| 定时任务 | 不存在，`package.json` 无 cron 相关依赖 |
| `totalViews` 递增 | 未实现，档口详情页没有浏览量 +1 逻辑 |

### 涉及文件

- `src/app/api/routes/stalls-ranked.ts` — 排名计算与 API
- `src/app/page.tsx` — 首页排名展示（`RatingChangeBadge`、`StallListItem`）
- `src/app/stalls/[id]/page.tsx` — 档口详情页（无浏览量递增）
- `src/db/schema.ts` / `src/db/schema.sqlite.ts` — stalls 表定义

### 解决思路

1. **新增 `ranking_snapshots` 表**：记录每日每个档口的快照数据（`stallId`, `score`, `rank`, `avgRating`, `totalReviews`, `totalViews`, `snapshotDate`）。用于计算 `ratingChange` 和排名变化。

   ```sql
   CREATE TABLE ranking_snapshots (
     id TEXT PRIMARY KEY,
     stall_id TEXT NOT NULL REFERENCES stalls(id),
     score REAL NOT NULL,
     rank INTEGER NOT NULL,
     avg_rating REAL NOT NULL,
     total_reviews INTEGER NOT NULL,
     total_views INTEGER NOT NULL,
     snapshot_date TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );
   ```

2. **实现每日排名计算触发机制**：
   - **方案 A（推荐）**：在每次 `GET /api/stalls/ranked` 请求时检查今日是否已有快照，若无则计算并写入（懒计算，无需 cron）。这样首次访问触发计算，后续请求复用已有快照。
   - **方案 B**：配置 Vercel Cron Jobs（`vercel.json`），每天凌晨调用 API 端点执行排名计算。

3. **修复 `ratingChange` 计算**：查询昨日（最近一个快照日）的快照数据，与今日计算结果对比：
   - `ratingChange = today.avgRating - yesterday.avgRating`
   - `rankChange = yesterday.rank - today.rank`（正值表示上升）

4. **优化 `calculateStallScore` 排名算法**：引入以下权重因子：
   - **时间衰减**：近期评价权重大于旧评价
   - **收藏数**：归一化后作为正面信号
   - **评价点赞数**：高质量评价的档口应有加成
   - **活跃度**：近期新增评价数的加权

5. **实现 `totalViews` 真实计数**：在 `GET /api/stalls/:id` 中增加 `UPDATE stalls SET total_views = total_views + 1 WHERE id = ?`。

---

## 问题 3：热门排行

### 现状

| 模块 | 状态 |
|------|------|
| `/trending` 页面 | 占位符，显示"即将上线，敬请期待" |
| 热门排行 API | 不存在 |
| 底部导航 "热门" 入口 | 已存在，指向 `/trending`，使用 Flame 图标 |

### 涉及文件

- `src/app/trending/page.tsx` — 占位符页面
- `src/components/layout/BottomNav.tsx` — 底部导航（"热门" 入口）

### 解决思路

1. **新增 `GET /api/stalls/trending` 路由**：基于平均打分排名。可有两种口径：
   - **纯评分排名**：按 `avgRating DESC` 排序，`totalReviews` 作为门槛（至少 N 条评价才上榜）
   - **综合热度排名**：复用 `calculateStallScore` 但调整权重（hot ranking 更侧重 avgRating，时间衰减更明显）

2. **实现 `/trending` 页面**：参照首页排名列表的 UI 结构，展示：
   - 档口排名列表（排名徽章、图片、名称、评分、评价数）
   - 支持按食堂筛选（复用 CafeteriaTabs 组件）
   - 时间范围切换（本周 / 本月 / 全部）

3. **与 stalls-ranked 的差异化**：
   - `stalls-ranked` = 综合热度排名（评分 + 评价数 + 浏览量加权），侧重"当前活跃度"
   - `trending` = 热门排行（更侧重近期评分质量），侧重"口碑好"

---

## 问题 4：收藏档口

### 现状

| 模块 | 状态 |
|------|------|
| `favorites` 数据库表 | 已在两个 schema 中定义，关系完整（`id`, `studentId`, `stallId`, `createdAt`） |
| Drizzle ORM 关系 | 已定义 `favoritesRelations`，关联 User 和 Stall |
| 统计 API (`/api/stats/my`) | 已实现，能查询当前用户的收藏数 |
| 收藏增删 API | 不存在 |
| 收藏状态查询 API | 不存在 |
| 档口详情/卡片中的收藏按钮 | 不存在 |
| `/profile/favorites` 页面 | 空占位符，仅显示"暂无收藏" |
| StallCard / StallListItem 组件 | 无收藏交互 |

### 涉及文件

- `src/db/schema.ts:82-87` — PostgreSQL favorites 表定义
- `src/db/schema.sqlite.ts:74-79` — SQLite favorites 表定义
- `src/app/api/routes/stats.ts` — 统计 API（含收藏数查询）
- `src/app/profile/favorites/page.tsx` — 空占位符
- `src/app/profile/page.tsx` — 个人资料页（收藏入口 + 徽章数）
- `src/app/stalls/[id]/page.tsx` — 档口详情（无收藏按钮）
- `src/components/common/StallCard.tsx` — 档口卡片（无收藏按钮）
- `src/app/page.tsx` — 首页排名列表（无收藏状态）

### 解决思路

1. **新增收藏 API 路由** (`src/app/api/routes/favorites.ts`)：
   - `POST /api/favorites` — 添加收藏，body: `{ stallId }`，需学生认证，防重复插入
   - `DELETE /api/favorites/:stallId` — 取消收藏
   - `GET /api/favorites` — 获取当前用户收藏列表，关联 stall 和 merchant 信息
   - `GET /api/favorites/check?stallId=X` — 检查单个档口是否已收藏，返回 `{ isFavorited: boolean }`

2. **创建 `FavoriteButton` 客户端组件**：
   - 接收 `stallId` 和初始 `isFavorited` 状态
   - 点击发送 POST/DELETE 请求
   - 乐观更新 UI（点击立即切换图标，失败回滚）
   - Heart 图标：实心红心 = 已收藏，空心灰心 = 未收藏

3. **在关键位置嵌入收藏按钮**：
   - `StallCard` 组件右上角
   - 档口详情页标题旁
   - 首页 `StallListItem`（可选，避免列表过于拥挤）

4. **实现 `/profile/favorites` 页面**：调用 `GET /api/favorites` 获取收藏列表，使用 `StallCard` 展示，支持取消收藏后实时从列表移除。

5. **排名 API 附带收藏状态**：在 `GET /api/stalls/ranked` 中，若用户已登录，JOIN `favorites` 表返回 `isFavorited` 字段，首页可直接显示收藏状态。

---

## 问题 5：回复评价和点赞评价

### 现状

| 模块 | 状态 |
|------|------|
| 点赞 API (`POST /api/reviews/:id/like`) | 已实现，切换模式（点赞/取消），更新 `review_likes` 表和 `reviews.likes` 计数字段 |
| 回复 API (`POST /api/reviews/:id/reply`) | 已实现，仅商家可回复，验证商家是否拥有该档口，存储 `merchantReply` 和 `repliedAt` |
| 点赞前端 UI（可点击按钮） | 不存在，所有页面仅显示静态数字文本 `👍 {likes}` |
| 商家回复编辑/删除 | 不存在，一旦回复后按钮隐藏，无法修改 |
| 学生收到回复通知 | 不存在，商家回复后学生无感知 |
| 消息页面 (`/messages`) | 占位符，显示"暂无消息"，无实际功能 |
| 评价 `isLiked` 状态查询 | API 未返回当前用户是否已点赞某条评价 |

### 涉及文件

- `src/app/api/routes/reviews.ts` — 评价 CRUD、点赞、回复 API
- `src/app/api/routes/merchant.ts` — 商家评价管理 API
- `src/app/stalls/[id]/page.tsx` — 档口详情（评价展示，无点赞按钮）
- `src/app/dishes/[id]/page.tsx` — 菜品详情（评价展示，无点赞按钮，无商家回复展示）
- `src/app/profile/reviews/page.tsx` — 用户评价列表（含图片、商家回复展示）
- `src/app/merchant/reviews/page.tsx` — 商家评价管理（回复对话框）
- `src/app/messages/page.tsx` — 消息页面占位符
- `src/db/schema.ts:58-80` — reviews 和 reviewLikes 表定义

### 解决思路

1. **点赞按钮 UI**：
   - 创建 `LikeButton` 客户端组件，接收 `reviewId`、`initialLikes`、`initialIsLiked`
   - 调用 `POST /api/reviews/:id/like`，带乐观更新（点击立即切换大拇指颜色和数字，失败回滚）
   - 在所有评价展示位置替换静态 `👍 {likes}` 文本：
     - 档口详情页 (`stalls/[id]/page.tsx`)
     - 菜品详情页 (`dishes/[id]/page.tsx`)
     - 用户评价列表 (`profile/reviews/page.tsx`)

2. **评价列表附带点赞状态**：修改以下 API，当用户已登录时 LEFT JOIN `review_likes` 表，返回 `isLiked` 布尔字段：
   - `GET /api/reviews?stallId=X`
   - `GET /api/reviews/my`
   - `GET /api/stalls/:id`（其中的 recentReviews）
   - `GET /api/dishes/:id`（其中的 reviews）
   - `GET /api/merchant/reviews`

3. **商家回复增强**：
   - `PUT /api/reviews/:id/reply` — 编辑已有回复
   - `DELETE /api/reviews/:id/reply` — 删除回复（清空 `merchantReply` 和 `repliedAt`）
   - 商家端 UI：已回复的评价显示回复内容和时间，提供"编辑"和"删除"按钮

4. **回复通知系统**：
   - 在 `reviews` 表增加 `notifyStudent` 布尔字段，商家回复时设为 `true`
   - `/api/reviews/my` 返回时附带 `hasNewReply` 字段
   - 消息页面 (`/messages`) 查询所有 `notifyStudent = true` 的评价，展示"商家回复了你的评价"通知列表
   - 学生点击通知跳转到对应评价，标记通知为已读

5. **实现消息页面**：从占位符变为功能页面：
   - 展示回复通知列表（商家头像、回复内容摘要、时间、关联评价链接）
   - 支持"全部已读"操作
   - 可选：系统通知（如收藏的档口有新评价等）

---

## 实施建议优先级

| 优先级 | 问题 | 理由 |
|--------|------|------|
| **P0** | 收藏档口 | 数据表已有，API 零实现，影响核心用户体验闭环 |
| **P0** | 点赞评价 | API 已有，只需补前端 UI，改动最小、效果最明显 |
| **P1** | 图片上传展示 | 商家端无法正常上传图片，用户体验严重受损 |
| **P1** | 回复评价增强 | 商家回复已有基础，补通知和编辑功能即可完善 |
| **P2** | 热门排行 | 页面是占位符，需要新 API + 新页面，工作量大 |
| **P2** | 每日排名算法 | 需要新表 + 定时/懒计算机制 + 算法优化，架构改动大 |
