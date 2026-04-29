# 评价图片无法显示 — 问题分析与修改方案

## 一、问题概述

评价菜品时上传的图片无法在评论区显示。经深入排查，该问题涉及上传、存储、序列化、前端展示全链路，共发现 **3 个 Bug** 和 **2 个代码异味**。

---

## 二、Bug 详细分析

### Bug 1：SQLite 模式下 `images` 数组未序列化为 JSON 字符串

**严重级别：CRITICAL**（仅影响 SQLite 本地开发环境）

**根因文件：** `src/app/api/routes/reviews.ts:79`

**问题描述：**
- 前端提交评价时，`images` 是 `string[]` 类型（如 `["/api/uploads/xxx.jpg"]`）
- 后端接收后，直接传入 `db.insert(reviews).values({ images: data.images })`
- PostgreSQL 的 `text('images').array()` 列支持原生数组，正常工作
- SQLite 的 `text('images')` 列只接受字符串，但代码未做 `JSON.stringify` 转换
- better-sqlite3 无法将 JS 数组绑定为 SQL 文本参数 → 抛 `TypeError: Unexpected binding type`

**影响范围：**
- **SQLite 环境（`DB_PROVIDER=local`）：** 任何包含 `images` 字段的评价创建请求都会崩溃（500 错误）
- 甚至空数组 `[]` 也会触发此错误，意味着 SQLite 下 **所有评价创建都失败**
- PostgreSQL 环境不受影响

**数据流验证：**

```
前端 images = ["/api/uploads/xxx.jpg"]  ✔
  → POST /api/reviews body.images ✔
    → zod 校验通过, data.images = ["/api/uploads/xxx.jpg"] ✔
      → db.insert(reviews).values({ images: data.images })
        → PostgreSQL: text[] 列接受数组 ✔
        → SQLite: text 列需要字符串，但传入数组 ✗ 崩溃
```

**相关证据：**
- SQLite schema 定义：`images: text('images').default('[]').notNull()`（`seed-local.ts:112` 传入的是字符串 `'[]'`）
- PostgreSQL schema 定义：`images: text('images').array().default([]).notNull()`
- 全项目无任何 `JSON.stringify` 对 `images` 的处理

---

### Bug 2：Vercel 生产环境下上传目录为临时文件系统

**严重级别：CRITICAL**（仅影响 Vercel/Serverless 生产部署）

**根因文件：** `src/app/api/routes/uploads.ts:6`、`src/app/api/routes/upload.ts:8`

**问题描述：**
- 图片上传保存到 `process.cwd() + '/uploads/'` 本地文件系统
- Vercel Serverless Functions 每次请求可能由不同实例处理，文件系统不共享
- 上传请求（POST）保存的文件，图片服务请求（GET）可能在不同实例上读取不到

**影响范围：**
- 部署到 Vercel 后，用户上传的图片几乎永远无法显示
- 本地开发环境不受影响（单进程共享文件系统）

**数据流验证：**

```
POST /api/upload/image
  → 写入 uploads/xxx.jpg (实例 A 的临时存储) ✔
  → 返回 URL: /api/uploads/xxx.jpg ✔

GET /api/uploads/xxx.jpg
  → 尝试读取 uploads/xxx.jpg (可能分配到实例 B 的临时存储)
  → 文件不存在 → 返回 404 ✗
```

---

### Bug 3：`serializeForJson` 对非 `Object` 构造函数的 Drizzle 对象跳过深层处理

**严重级别：MEDIUM**

**根因文件：** `src/lib/db-utils.ts:36`

**问题描述：**
```typescript
if (data.constructor && data.constructor.name !== 'Object' && data.constructor.name !== 'Row') {
  return data;
}
```
- 当 Drizzle 返回的对象 `constructor.name` 不是 `'Object'` 或 `'Row'` 时，整个对象被原样返回
- 虽然 `images` 字段仍会包含在 JSON 响应中，但可能包含 Drizzle 内部包装器或 getter
- 某些 Drizzle 版本可能返回代理对象（Proxy），导致 `JSON.stringify` 序列化行为不可预测

**影响范围：**
- 三个 API 端点使用了 `serializeForJson`：`GET /api/dishes/:id`、`GET /api/stalls/:id`、`GET /api/stalls`
- 两个端点未使用：`GET /api/reviews/my`、`GET /api/merchant/reviews`
- 行为不一致导致前端需要兼容多种数据格式

---

### Bug 4 (Code Smell)：`normalizeImages` 函数在多地重复定义

**严重级别：LOW**

**涉及文件：**
- `src/app/dishes/[id]/page.tsx:43`
- `src/app/stalls/[id]/page.tsx:54`
- `src/app/merchant/reviews/page.tsx:32`
- `src/app/profile/reviews/page.tsx:47`（内联逻辑，实现有细微差异）

**问题描述：**
- 同一套解析逻辑复制粘贴 4 次
- `profile/reviews/page.tsx` 使用内联逻辑（非函数），与其它三处的 `normalizeImages` 实现不同
- 若后续需要修改图片数据格式，必须同时修改 4 处，极易遗漏

---

### Bug 5 (Code Smell)：`normalizeImages` 的 `catch` 块使用脆弱的启发式判断

**严重级别：LOW**

**涉及文件：**
- `src/app/dishes/[id]/page.tsx:50`
- `src/app/stalls/[id]/page.tsx:61`
- `src/app/merchant/reviews/page.tsx:39`

**问题描述：**
```typescript
catch {
  return images.length > 2 ? [images] : [];
}
```
- 当 `JSON.parse` 失败时，通过字符串长度 > 2 来判断是否是单张图片 URL
- 若数据库中的图片数据损坏（如多张图片 URL 被逗号拼接成单个字符串），会被错误地当作单张图片处理
- 长度 ≤ 2 的短字符串被静默丢弃

---

## 三、修改方案总览

| Bug | 优先级 | 修改量 | 风险 |
|-----|--------|--------|------|
| Bug 1: SQLite 序列化 | P0 | 1 行 | 低 |
| Bug 2: Vercel 文件存储 | P0 | 中等 | 中 |
| Bug 3: serializeForJson | P1 | 少量 | 中 |
| Bug 4: 代码重复 | P2 | 中等 | 低 |
| Bug 5: 启发式判断 | P2 | 1 行 | 低 |
