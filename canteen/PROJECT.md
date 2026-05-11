# 校园食堂 — 项目完整文档

> 校园餐饮 UGC 社区与 SaaS 管理平台。学生浏览发现档口、发表评价、收藏档口；商家管理档口菜品、回复评价、查看统计数据。

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [项目目录结构](#3-项目目录结构)
4. [数据库设计](#4-数据库设计)
5. [后端 API 接口](#5-后端-api-接口)
6. [前端核心页面实现](#6-前端核心页面实现)
7. [认证与授权](#7-认证与授权)
8. [架构亮点](#8-架构亮点)

---

## 1. 项目概述

### 核心功能

- **学生端**: 浏览食堂/档口、查看排行榜、搜索菜品、发表评价（带图/评分/关联菜品）、点赞/删除评价、收藏档口
- **商家端**: 管理档口信息、菜品 CRUD、回复评价、查看 Dashboard（走势图/菜品热度排行）
- **通用**: 用户注册/登录、个人资料编辑、消息通知

### 用户角色

| 角色 | 说明 | 测试账号 |
|------|------|---------|
| `student` | 学生 — 浏览、评价、收藏 | `student1@example.com` |
| `merchant` | 商家 — 管理档口/菜品、回复评价 | `merchant1@example.com` |

> 统一密码: `password123`

---

## 2. 技术栈

| 层级 | 技术 |
|------|------|
| **框架** | Next.js 16 (App Router) + React 19 + React Compiler |
| **语言** | TypeScript 严格模式 |
| **样式** | Tailwind CSS v4 + shadcn/ui (new-york, zinc 色系) |
| **API** | Hono 4 — 轻量框架，部署在 Vercel Edge |
| **数据库** | Drizzle ORM — **双 Provider 架构**: Neon PostgreSQL (生产) + better-sqlite3 (本地开发) |
| **认证** | next-auth v5 — Credentials Provider + JWT |
| **状态管理** | @tanstack/react-query (服务端) + zustand (客户端) |
| **包管理** | Bun |
| **UI 组件** | lucide-react, framer-motion, recharts, embla-carousel |

---

## 3. 项目目录结构

```
canteen/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # 根布局: AuthProvider → QueryProvider
│   │   ├── page.tsx                  # 首页: 食堂Tab + 档口排行榜
│   │   ├── globals.css               # Tailwind CSS v4 全局样式
│   │   │
│   │   ├── landing/page.tsx          # 引导页 (首次访问)
│   │   ├── login/page.tsx            # 登录
│   │   ├── register/page.tsx         # 注册
│   │   ├── stalls/[id]/page.tsx      # 档口详情 (菜品+评价+点赞/删除)
│   │   ├── dishes/[id]/page.tsx      # 菜品详情
│   │   ├── trending/page.tsx         # 热门/搜索页 (菜品搜索+食堂过滤)
│   │   ├── profile/page.tsx          # 个人中心 (头像上传/角色菜单)
│   │   ├── profile/favorites/page.tsx # 我的收藏
│   │   ├── profile/reviews/page.tsx   # 我的评价
│   │   ├── messages/page.tsx         # 消息列表
│   │   ├── settings/page.tsx         # 设置
│   │   ├── reviews/new/page.tsx      # 发表评价 (菜品选择/评分/图片)
│   │   │
│   │   ├── merchant/                 # 商家后台 (Server Layout 鉴权)
│   │   │   ├── layout.tsx            # Merchant 路由守卫
│   │   │   ├── page.tsx              # Dashboard: 统计卡片 + 评分趋势折线图 + 菜品热度柱状图
│   │   │   ├── stall/page.tsx        # 档口信息编辑
│   │   │   ├── dishes/page.tsx       # 菜品 CRUD (Dialog 表单 + 上架/下架)
│   │   │   └── reviews/page.tsx      # 评价列表 + 商家回复
│   │   │
│   │   └── api/                      # API 层
│   │       ├── [[...route]]/route.ts # Hono 入口 (side-effect 导入各路由模块)
│   │       ├── routes/               # 10 个 Hono 路由模块
│   │       ├── register/route.ts     # 注册 (Next.js Route Handler)
│   │       └── auth/[...nextauth]/   # NextAuth 处理
│   │
│   ├── components/                   # React 组件
│   │   ├── ui/                       # shadcn/ui (button, card, dialog, input...)
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx         # 底部导航栏 (首页/热门/消息/我的)
│   │   │   ├── MobileHeader.tsx      # 移动端头部
│   │   │   └── MerchantLayout.tsx    # 商家布局 (Tab 导航 + logout)
│   │   ├── features/
│   │   │   ├── home/CafeteriaTabs.tsx
│   │   │   └── trending/             # CafeteriaFilterSheet, DishSearchItem
│   │   ├── common/                   # StallCard, ImageUpload, ReviewImage
│   │   └── providers/                # SessionProvider, QueryProvider
│   │
│   ├── db/                           # 数据库层
│   │   ├── index.ts                  # 双 Provider 连接工厂
│   │   ├── schema.ts                 # PostgreSQL (pg-core) 表定义 + relations
│   │   ├── schema.sqlite.ts          # SQLite 表定义 (同步维护)
│   │   ├── seed.ts / seed-local.ts   # 种子数据
│   │   ├── init-local.ts / sync.ts   # 初始化/同步工具
│   │   └── test-local.ts             # 本地测试
│   │
│   ├── lib/                          # 工具库
│   │   ├── auth.ts                   # NextAuth 配置
│   │   ├── hono.ts                   # Hono app 实例 + 全局错误处理
│   │   ├── db-utils.ts               # serializeForJson() 时间戳统一序列化
│   │   ├── retry.ts                  # withRetry() 指数退避重试
│   │   ├── review-utils.ts           # calculateHotScore() 热度算法
│   │   └── utils.ts                  # cn(), getDefaultAvatar()
│   │
│   └── types/
│       └── next-auth.d.ts            # Auth 类型扩展 (user.id, user.role)
│
├── drizzle/                          # Drizzle Kit 迁移 (0000_bouncy_mattie_franklin.sql)
├── data/local.db                     # SQLite 数据库文件 (本地开发)
├── uploads/                          # 上传图片存储
├── public/avatars/                   # 默认头像 SVG
│
├── package.json                      # 依赖与脚本
├── next.config.ts                    # Next.js 配置 (React Compiler)
├── drizzle.config.ts                 # Drizzle Kit 配置
├── components.json                   # shadcn/ui 配置
├── CLAUDE.md                         # AI 辅助开发指南
└── .env.local                        # 环境变量 (DB_PROVIDER=local)
```

---

## 4. 数据库设计

### 4.1 ER 概览

```
users (学生/商家)
  │
  ├──< reviews (评价) ──> stalls (档口) ──> cafeterias (食堂)
  │       │
  │       └──< review_likes (点赞) ──> users
  │
  ├──< favorites (收藏) ──> stalls
  │
  ├──< messages (消息)
  │
  └──< stalls.merchantId (商家拥有)
          │
          └──< dishes (菜品)
```

### 4.2 表结构

#### users (用户表)

| 字段 | PostgreSQL 类型 | SQLite 类型 | 说明 |
|------|----------------|-------------|------|
| id | `uuid` PK defaultRandom | `text` PK | UUID |
| email | `varchar(255)` unique | `text` unique | 邮箱 |
| password | `varchar(255)` | `text` | bcrypt 哈希密码 |
| role | `varchar(20)` | `text` | `'student'` / `'merchant'` |
| name | `varchar(100)` | `text` | 姓名 |
| avatar | `varchar(500)`? | `text`? | 头像 URL |
| created_at | `timestamp` defaultNow | `integer` (ms) | 创建时间 |
| updated_at | `timestamp` defaultNow | `integer` (ms) | 更新时间 |

#### cafeterias (食堂表 — 静态数据)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | `uuid` PK | UUID |
| name | `varchar(100)` | 食堂名称 (东一食堂/东二食堂/北一食堂/北二食堂) |
| description | `text`? | 描述 |
| location | `varchar(200)` | 位置 |
| image | `varchar(500)`? | 图片 |
| order | `integer` default 0 | 排序 |

#### stalls (档口表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | `uuid` PK | UUID |
| name | `varchar(100)` | 档口名称 |
| description | `text` | 描述 |
| cafeteria_id | `uuid` FK → cafeterias.id | 所属食堂 |
| merchant_id | `uuid` FK → users.id? | 所属商家 (可为空) |
| image | `varchar(500)`? | 图片 |
| avg_rating | `decimal(2,1)` default 0 | 平均评分 (4.5) |
| total_reviews | `integer` default 0 | 评价总数 |
| total_views | `integer` default 0 | 浏览总数 |
| is_active | `boolean` default true | 是否营业 |
| created_at / updated_at | timestamp | 时间戳 |

#### dishes (菜品表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | `uuid` PK | UUID |
| name | `varchar(100)` | 菜品名称 |
| description | `text`? | 描述 |
| stall_id | `uuid` FK → stalls.id | 所属档口 |
| price | `decimal(10,2)` | 价格 |
| image | `varchar(500)`? | 图片 |
| is_available | `boolean` default true | 是否在售 |
| avg_rating | `decimal(2,1)` default 0 | 平均评分 |
| total_reviews | `integer` default 0 | 评价数 |
| created_at / updated_at | timestamp | 时间戳 |

#### reviews (评价表 — 核心业务表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | `uuid` PK | UUID |
| student_id | `uuid` FK → users.id | 评价学生 |
| stall_id | `uuid` FK → stalls.id | 评价档口 |
| dish_id | `uuid` FK → dishes.id? | 关联菜品 (可选) |
| rating | `integer` | 评分 1-5 |
| content | `text` | 评价内容 |
| images | `text[]` / `text` (JSON) | 图片数组 |
| likes | `integer` default 0 | 点赞数 (反范式缓存) |
| merchant_reply | `text`? | 商家回复 |
| replied_at | `timestamp`? | 回复时间 |
| created_at / updated_at | timestamp | 时间戳 |

#### review_likes (评价点赞表 — 多对多)

| 字段 | 类型 | 说明 |
|------|------|------|
| review_id | `uuid` FK → reviews.id (CASCADE) | 评价 ID |
| student_id | `uuid` FK → users.id (CASCADE) | 学生 ID |
| created_at | `timestamp` | 时间 |

> **联合主键** (review_id, student_id)

#### favorites (收藏表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | `uuid` PK | UUID |
| student_id | `uuid` FK → users.id (CASCADE) | 学生 ID |
| stall_id | `uuid` FK → stalls.id (CASCADE) | 档口 ID |
| created_at | `timestamp` | 时间 |

#### messages (消息表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | `uuid` PK | UUID |
| user_id | `uuid` FK → users.id (CASCADE) | 接收用户 |
| type | `varchar(50)` | 消息类型 |
| title | `varchar(200)` | 标题 |
| content | `text` | 内容 |
| is_read | `boolean` default false | 是否已读 |
| created_at | `timestamp` | 时间 |

### 4.3 双 Provider 架构

```typescript
// src/db/index.ts — 核心源码
const dbProvider = process.env.DB_PROVIDER || 'neon';
export const isLocalDB = dbProvider === 'local';

// Neon PostgreSQL (生产): 30s fetch timeout, Drizzle pg-core schema
// SQLite (本地开发): better-sqlite3, 注册 gen_random_uuid() + now() 函数

// 原生 SQL 函数 (用于 SQLite 写操作和复杂查询)
export async function executeSQL(sql: string, params: any[] = []) { ... }
export async function querySQL(sql: string, params: any[] = []) { ... }
```

**关键差异**: SQLite 使用 `integer` 存储时间戳 (ms), PostgreSQL 使用原生 `timestamp`。`serializeForJson()` 统一将两种格式序列化为 ISO 字符串。

---

## 5. 后端 API 接口

### 5.1 API 架构

```
src/app/api/[[...route]]/route.ts    ← Hono catch-all 入口
  └── side-effect imports 注册 10 个路由模块
       ├── cafeterias.ts     → GET    /api/cafeterias
       ├── stalls-ranked.ts  → GET    /api/stalls/ranked
       ├── stalls.ts         → GET    /api/stalls, GET /api/stalls/:id, PUT /api/stalls/:id, GET /api/stalls/:id/stats
       ├── dishes.ts         → GET    /api/dishes, GET /api/dishes/search, GET /api/dishes/:id
       │                       POST   /api/dishes, PUT /api/dishes/:id, DELETE /api/dishes/:id
       ├── reviews.ts        → GET    /api/reviews, GET /api/reviews/my, POST /api/reviews
       │                       DELETE /api/reviews/:id, POST /api/reviews/:id/like, POST /api/reviews/:id/reply
       ├── upload.ts         → POST   /api/upload/image
       ├── uploads.ts        → GET    /api/uploads/:filename
       ├── merchant.ts       → GET    /api/merchant/stall, /merchant/dishes, /merchant/stats, /merchant/reviews
       ├── stats.ts          → GET    /api/stats/my
       └── user.ts           → PUT    /api/user/profile

独立路由:
  src/app/api/register/route.ts          → POST /api/register
  src/app/api/auth/[...nextauth]/route.ts → NextAuth handlers
```

### 5.2 接口详情

#### 食堂

**GET /api/cafeterias** — 获取全部食堂列表

```typescript
// src/app/api/routes/cafeterias.ts — 核心源码
app.get('/cafeterias', async (c) => {
  const data = await withRetry(() =>
    (db as any).query.cafeterias.findMany({ orderBy: cafeterias.order })
  );
  return c.json({ success: true, data: serializeForJson(data) });
});
```

#### 档口

**GET /api/stalls/ranked?cafeteriaId=xxx** — 档口排行榜 (核心算法)

```typescript
// src/app/api/routes/stalls-ranked.ts — 核心算法
function calculateStallScore(avgRating: number, totalReviews: number, totalViews: number): number {
  const ratingScore = avgRating * 20;
  const reviewWeight = Math.min(1.0, 0.7 + (Math.log(totalReviews + 1) / Math.log(100)) * 0.3);
  const viewWeight  = Math.min(1.0, 0.85 + (Math.log(totalViews + 1) / Math.log(500)) * 0.15);
  return ratingScore * reviewWeight * viewWeight;
}
```

权重逻辑: 评分满分 100 分 (5×20), 评价数/浏览量对数归一化后作为衰减权重。

**GET /api/stalls/:id** — 档口详情 (含菜品 + 最近 5 条评价)

评价富化: 查询当前用户是否点赞、是否为本人评价、计算 `hotScore` 用于排序。

**GET /api/stalls/:id/stats** — 档口统计 (商家专用, 7 天评分趋势 + 菜品热度)

**PUT /api/stalls/:id** — 更新档口 (商家专用, 动态 SQL 构建)

#### 菜品

**GET /api/dishes?stallId=xxx** — 档口下的菜品列表

**GET /api/dishes/search?q=xxx&cafeteriaIds=xxx** — 菜品搜索 (LIKE 模糊匹配 + 食堂过滤)

**GET /api/dishes/:id** — 菜品详情 (含关联档口 + 最近 10 条评价)

**POST /api/dishes** — 新增菜品 (商家专用, Zod 校验)

**PUT /api/dishes/:id** — 更新菜品 (商家专用, JOIN 校验权限)

**DELETE /api/dishes/:id** — 删除菜品 (商家专用)

#### 评价 (核心模块)

**GET /api/reviews?stallId=xxx** — 获取档口评价列表 (按热度排序)

```typescript
// src/lib/review-utils.ts — 热度算法
export function calculateHotScore(likes: number, createdAt: Date | number): number {
  const ageMs = Date.now() - (createdAt instanceof Date ? createdAt.getTime() : createdAt);
  const ageHours = ageMs / (1000 * 60 * 60);
  const likeScore = Math.log(likes + 1) * LIKE_WEIGHT + 1;
  const decay = Math.pow(ageHours + HOUR_DIVISOR, GRAVITY);
  return likeScore / decay;
}
// LIKE_WEIGHT=10, GRAVITY=1.5, HOUR_DIVISOR=2
```

**POST /api/reviews** — 发表评价 (学生专用)
- 原子操作: 插入评价 → 重新计算档口 avgRating + totalReviews → 计算菜品评分
- 使用 `isLocalDB` 判断 SQLite/PostgreSQL 差异处理 images 字段

**DELETE /api/reviews/:id** — 删除评价 (本人 + 学生)
- 级联删除 review_likes → 重新计算档口/菜品评分

**POST /api/reviews/:id/like** — 点赞/取消点赞 (切换逻辑)

**GET /api/reviews/my** — 我的评价列表 (含档口名、菜品名)

**POST /api/reviews/:id/reply** — 商家回复 (校验商家属于该档口)

#### 商家

**GET /api/merchant/stall** — 获取商家档口信息

**GET /api/merchant/dishes** — 档口下菜品

**GET /api/merchant/stats** — Dashboard 统计 (7 天走势 + 菜品热度排行)

**GET /api/merchant/reviews** — 评价管理 (含学生信息)

#### 用户

**PUT /api/user/profile** — 更新个人信息 (name, avatar)

**GET /api/stats/my** — 用户统计 (评价数, 收藏数, 未读消息数)

#### 上传

**POST /api/upload/image** — 图片上传
- 限制: JPEG/PNG/WebP, 最大 5MB
- 存储: `uploads/` 目录, 文件名 `{timestamp}-{random}.{ext}`
- 返回: `{ url: "/api/uploads/xxx.jpg" }`

**GET /api/uploads/:filename** — 图片服务 (强缓存 1 年)

#### 注册

**POST /api/register** — 用户注册
- Zod 校验 (email, password≥6, name≥2, role)
- bcrypt 哈希 + 邮箱唯一性检查

### 5.3 Hono 全局错误处理

```typescript
// src/lib/hono.ts
app.onError((err, c) => {
  // DB 连接错误 → 503 + 中文消息 "数据库连接失败，请稍后重试"
  // 其他错误 → 500 + 错误消息
});
```

### 5.4 重试机制

```typescript
// src/lib/retry.ts
// 指数退避: 3 次重试, 1s → 2s → 4s
// 仅重试可恢复错误: timeout / fetch failed / econnreset / network / neon / connect
```

---

## 6. 前端核心页面实现

### 6.1 首页 `src/app/page.tsx`

```
┌─────────────────────────────────┐
│ 校园食堂                    ⚙️  │  ← sticky header
├─────────────────────────────────┤
│ [热门] [东一食堂] [东二食堂]...  │  ← 食堂 Tab 切换
├─────────────────────────────────┤
│ 🔥 热门档口                    │
│ ┌───────────────────────────┐  │
│ │ 🥇  川味小炒   ★4.5 128条  │  │  ← 前三名 + 排名徽章
│ │ 🥈  家常快餐   ★4.2 96条   │  │
│ │ 🥉  麻辣烫     ★4.3 156条  │  │
│ ├───────────────────────────┤  │
│ │     重庆小面  ★4.6 203条  │  │  ← 后续 + 变化指示
│ │     烧烤档    ★4.3 178条  │  │
│ └───────────────────────────┘  │
├─────────────────────────────────┤
│  首页  │  热门  │  消息  │  我的 │  ← BottomNav
└─────────────────────────────────┘
```

**核心逻辑**:
- `localStorage` 检查 `skipLanding` 决定是否跳转引导页
- `useQuery` 并行加载食堂列表 + 排行榜数据
- 切换食堂 Tab 时附带 `cafeteriaId` 参数重新请求 `/api/stalls/ranked`
- 前三名显示 `RankBadge` (🥇🥈🥉), 其余显示 `RatingChangeBadge`
- `framer-motion` 逐项动画入场

### 6.2 档口详情页 `src/app/stalls/[id]/page.tsx`

```
┌─────────────────────────────────┐
│ [←]       (档口 Banner 图)      │
├─────────────────────────────────┤
│ 川味小炒               ● 营业中  │
│ 📍东一食堂  ★4.5 · 128条评价    │
│ 正宗四川口味，麻辣鲜香            │
├─────────────────────────────────┤
│ 菜品 (6)                        │
│ ┌───────────────────────────┐  │
│ │ 🖼 宫保鸡丁  ★4.6 45人   │  │
│ │               ¥18.00  [评价] │  │
│ │ 麻婆豆腐    ★4.4 38人     │  │
│ │               ¥12.00  [评价] │  │
│ └───────────────────────────┘  │
├─────────────────────────────────┤
│ 评价 (128)            [写评价]  │
│ ┌───────────────────────────┐  │
│ │ 👤 小明  ★★★★☆            │  │
│ │ 味道很好，下次还会再来！      │  │
│ │ [图片] [图片]               │  │
│ │ 05月10日     ♥24   🗑️      │  │
│ │ ┌─────────────────────┐   │  │
│ │ │ 商家回复：感谢支持！  │   │  │  ← 商家回复气泡
│ │ └─────────────────────┘   │  │
│ └───────────────────────────┘  │
├─────────────────────────────────┤
│ BottomNav                       │
└─────────────────────────────────┘
```

**核心逻辑**:
- 访问时自动 `totalViews + 1` (浏览量统计)
- 评价列表 `enrichReviews`: 批量查询点赞状态、标注是否本人、计算 `hotScore`
- 按 `hotScore` 降序排列 (非创建时间)
- **点赞**: 乐观更新 (先改 UI 再请求), 失败回滚
- **删除**: Modal 确认 → API → 刷新缓存
- 每道菜品旁有 [评价] 按钮, 跳转到 `reviews/new?stallId=&dishId=`

### 6.3 发表评价页 `src/app/reviews/new/page.tsx`

```
┌─────────────────────────────────┐
│ [←] 发布评价                    │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 评价菜品（可选)               │ │
│ │ [对整个档口评分  ▼]          │ │  ← 下拉选择菜品
│ │                             │ │
│ │ ○○○○○ 评分                  │ │  ← 1-5 星点击
│ │                             │ │
│ │ 评价内容                     │ │
│ │ [分享您的用餐体验...]         │ │
│ │                             │ │
│ │ 上传图片                     │ │
│ │ [📷][📷][📷][📷][📷][📷]   │ │  ← ImageUpload 最多 6 张
│ └─────────────────────────────┘ │
│ [        发布评价          ]    │
└─────────────────────────────────┘
```

**核心逻辑**:
- `useSearchParams` 获取 URL 参数 `stallId` 和 `dishId`
- `useEffect` 自动选中 URL 中的 `dishId`
- 提交后 `invalidateQueries` 刷新档口/菜品/我的评价缓存
- 未登录或非学生角色显示拦截提示

### 6.4 热门/搜索页 `src/app/trending/page.tsx`

```
┌─────────────────────────────────┐
│ 热门                          🔽│  ← 食堂过滤 Sheet
├─────────────────────────────────┤
│ [🔍 搜索菜品名称...          ✕] │  ← 300ms debounce
├─────────────────────────────────┤
│ [面食] [米饭] [烧烤] [小吃] ...  │  ← 预设标签
├─────────────────────────────────┤
│ 搜索结果                        │
│ ┌───────────────────────────┐  │
│ │ 重庆小面  川味小炒 · 东一   │  │
│ │ ★4.5  ¥10.00  67条评价    │  │
│ └───────────────────────────┘  │
└─────────────────────────────────┘
```

**核心逻辑**:
- `useDebounce(searchQuery, 300)` 防抖
- `CafeteriaFilterSheet` 通过 Sheet 组件选择食堂进行过滤
- 调用 `/api/dishes/search?q=xxx&cafeteriaIds=xxx`
- 预设标签点击自动填入搜索框

### 6.5 个人中心 `src/app/profile/page.tsx`

**功能列表**:
- 头像显示 + 悬停上传 (调用 `/api/upload/image` → `/api/user/profile`)
- 角色标签 (学生/商家)
- 统计徽章 (评价数、收藏数、未读消息数)
- 菜单: 我的评价 / 我的收藏 / 消息通知 / (商家后台) / 设置
- 退出登录按钮

### 6.6 商家后台 `src/app/merchant/`

#### 路由守卫

```typescript
// src/app/merchant/layout.tsx — 服务端组件
export default async function MerchantRootLayout({ children }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'merchant') {
    redirect('/login');
  }
  return <MerchantLayout>{children}</MerchantLayout>;
}
```

#### Dashboard `src/app/merchant/page.tsx`

```
┌──────────────────────────────────┐
│ 👁 总浏览量  💬 总评价数          │
│   500         128               │
│ ★ 平均评分   📈 评分趋势          │
│   4.5        3 新评价            │
├──────────────────────────────────┤
│ 7天评分趋势 (折线图)              │
│  ╱╲                             │
│ ╱  ╲╱╲   ╱╲                    │
│         ╲╱  ╲╱                  │
│  05/04  05/06  05/08  05/10     │
├──────────────────────────────────┤
│ 菜品热度排行 (柱状图)              │
│ 宫保鸡丁  ████████ 45            │
│ 麻婆豆腐  ███████  38            │
└──────────────────────────────────┘
```

使用 `recharts` 的 `LineChart` + `BarChart` 渲染可视化数据。

#### 菜品管理 `src/app/merchant/dishes/page.tsx`

**核心 CRUD**:
- `useMutation` + `useQueryClient.invalidateQueries` 模式
- Dialog 表单: 名称/价格/介绍/图片/在售开关
- 列表展示菜品卡片 + 编辑/删除按钮
- `Switch` 控制是否售罄

---

## 7. 认证与授权

### 7.1 NextAuth 配置

```typescript
// src/lib/auth.ts
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Credentials({...})],   // 邮箱密码登录
  callbacks: {
    jwt({ token, user }) {           // JWT 存储 role, id, avatar
      token.role = user.role;
      token.id = user.id;
      return token;
    },
    session({ session, token }) {     // Session 注入 user.role, user.id
      session.user.role = token.role;
      session.user.id = token.id;
      return session;
    },
  },
  session: { strategy: 'jwt' },
});
```

### 7.2 类型扩展

```typescript
// src/types/next-auth.d.ts
declare module 'next-auth' {
  interface User { role: 'student' | 'merchant'; avatar?: string; }
  interface Session { user: { id: string; role: 'student' | 'merchant'; avatar?: string; }; }
}
```

### 7.3 API 鉴权模式

```typescript
// 通用鉴权模式
const session = await auth();
if (!session?.user || session.user.role !== 'merchant') {
  return c.json({ success: false, error: 'Unauthorized' }, 401);
}
```

---

## 8. 架构亮点

### 双 Provider 数据库架构

项目通过环境变量 `DB_PROVIDER` 在 Neon PostgreSQL 和 better-sqlite3 之间切换。**核心挑战**: PostgreSQL 使用原生 `uuid`/`timestamp`/`text[]`, SQLite 使用 `text`/`integer`/`JSON string`。解决方案:

1. 两套 Schema (`schema.ts` + `schema.sqlite.ts`), 通过 `isLocalDB` 分支选择
2. `serializeForJson()` 统一将 SQLite 整数时间戳转为 ISO 字符串
3. 写操作使用原生 SQL (`executeSQL`/`querySQL`) 避免 Drizzle ORM SQLite 兼容性问题

### 热度排序算法

评价排序不按时间倒序, 而是使用类似 Hacker News 的**热度衰减算法**:

```
hotScore = (log(likes + 1) * 10 + 1) / (ageHours + 2)^1.5
```

- 点赞数对数缩放 → 防止刷赞
- 时间幂次衰减 → 新内容自然下沉
- 越新 + 点赞越多 → 排名越高

### 档口排名算法

```typescript
score = (avgRating * 20) × reviewWeight × viewWeight
reviewWeight = min(1.0, 0.7 + log(reviews+1)/log(100) * 0.3)
viewWeight   = min(1.0, 0.85 + log(views+1)/log(500) * 0.15)
```

评价数和浏览量作为置信度权重, 防止 1 条五星评价就排第一。

### Side-effect 路由注册

```typescript
// [[...route]]/route.ts
import '@/app/api/routes/stalls';   // side-effect: 导入即注册路由
import '@/app/api/routes/reviews';
export const GET = handle(app);
```

这种模式避免手动组合路由, 每个路由文件自包含。

### 乐观更新模式

评价点赞使用乐观更新: 先修改 UI 状态 → 发起请求 → 失败回滚, 提升用户体验。

### 完整测试账号体系

种子数据包含 4 个食堂、7 个档口、6 道菜品、20 条随机评价、5 个商家 + 5 个学生, 开箱即用。
