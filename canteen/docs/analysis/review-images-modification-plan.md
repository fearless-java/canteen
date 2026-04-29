# 评价图片无法显示 — 可执行修改方案

## 修改前准备

确认当前 DB 环境：`echo $DB_PROVIDER`（默认为 `neon`）

---

## 步骤 1：修复 SQLite 模式下 images 数组序列化

**目标：** 确保 SQLite 也能正确存储图片 URL 数组

**修改文件：** `src/app/api/routes/reviews.ts`

**操作：**

在第 1 行 import 区域，确认已有 `isLocalDB` 导入（第 2 行已有 `import { db, isLocalDB } from '@/db'`）。

将第 79 行：
```typescript
images: data.images,
```

修改为：
```typescript
images: isLocalDB ? JSON.stringify(data.images) : data.images,
```

**原理：**
- PostgreSQL 的 `text('images').array()` 原生接受 JS 数组
- SQLite 的 `text('images')` 需要 JSON 字符串
- `isLocalDB` 来自 `src/db/index.ts`，判断 `DB_PROVIDER === 'local'`

**验证方法：**
1. `bun run dev:local` 启动 SQLite 模式
2. 创建一个带图片的评价，确认不报 500 错误
3. 用 SQLite 浏览器打开 `data/local.db`，查看 `reviews.images` 列应为 `["/api/uploads/xxx.jpg"]`

---

## 步骤 2：修复 Vercel 生产环境文件存储方案

**目标：** 将图片存储从本地文件系统迁移到外部对象存储

### 方案 A（推荐）：使用 Vercel Blob Storage

**依赖安装：**
```bash
bun add @vercel/blob
```

**修改文件 1：** `src/app/api/routes/upload.ts`

```typescript
import { put } from '@vercel/blob';
// 移除: import { writeFile } from 'fs/promises';
// 移除: import { mkdir } from 'fs/promises';
// 移除: import path from 'path';
// 移除: import { cwd } from 'process';

// 移除第 8 行: const UPLOAD_DIR = ...

app.post('/upload/image', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return c.json({ success: false, error: 'No image provided' }, 400);
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ success: false, error: 'Invalid file type' }, 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return c.json({ success: false, error: 'File too large (max 5MB)' }, 400);
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // 上传到 Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    return c.json({
      success: true,
      data: {
        url: blob.url,  // 返回完整 URL
        filename,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ success: false, error: 'Upload failed' }, 500);
  }
});
```

**修改文件 2：** `src/app/api/routes/uploads.ts`

删除或注释掉整个文件（不再需要本地文件服务路由），或者改为重定向到 Vercel Blob URL。

**配置环境变量：**
在 Vercel 项目设置中添加：
```
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

本地开发在 `.env` 中添加：
```
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

### 方案 B（备选）：使用 S3 兼容存储（AWS S3 / Cloudflare R2 / 阿里云 OSS）

**依赖安装：**
```bash
bun add @aws-sdk/client-s3
```

**实现思路类似方案 A，替换 `put` 为 S3 `PutObjectCommand`。**

### 方案 C（最小改动）：保留本地文件，修复生产可访问性

如果暂时不想引入外部存储，可以添加基于文件名的缓存逻辑，但此方案不彻底，不推荐生产使用。

---

## 步骤 3：修复 `serializeForJson` 的 Drizzle 代理对象处理

**目标：** 确保所有 API 端点返回一致的序列化数据

**修改文件：** `src/lib/db-utils.ts`

**操作 1：** 将第 36 行的构造函数检查改为更安全的判断：

```typescript
// 旧代码:
if (data.constructor && data.constructor.name !== 'Object' && data.constructor.name !== 'Row') {
  return data;
}

// 新代码:
// 只跳过二进制数据，所有普通对象都进行深层处理
if (data instanceof Buffer || data instanceof ArrayBuffer || data instanceof Uint8Array) {
  return data;
}
// Date 已在前面处理，这里不再需要构造函数名检查
```

**操作 2：** 确保 `JSON.stringify` 能够正确处理所有字段：

```typescript
const result: any = {};
for (const [key, value] of Object.entries(data)) {
  try {
    result[key] = serializeForJson(value);
  } catch (e) {
    // 如果序列化失败，尝试获取原始值
    try {
      result[key] = JSON.parse(JSON.stringify(value));
    } catch {
      result[key] = String(value);
    }
  }
}
return result;
```

---

## 步骤 4：提取公共 `normalizeImages` 工具函数

**目标：** 消除重复代码，统一图片数据解析逻辑

**新建文件：** `src/lib/review-utils.ts`

```typescript
/**
 * 统一处理评价图片数据
 * 兼容 PostgreSQL 原生数组和 SQLite JSON 字符串两种格式
 */
export function normalizeImages(images: unknown): string[] {
  if (!images) return [];

  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // 单张图片 URL 字符串（极少数兼容场景）
      if (typeof images === 'string' && images.startsWith('/api/uploads/')) {
        return [images];
      }
      return [];
    }
  }

  if (Array.isArray(images)) {
    return images.filter((url): url is string => typeof url === 'string' && url.length > 0);
  }

  return [];
}
```

**修改 4 个文件，导入并使用公共函数：**

1. `src/app/dishes/[id]/page.tsx` — 移除第 43-55 行的 `normalizeImages`，改为导入
2. `src/app/stalls/[id]/page.tsx` — 移除第 54-66 行的 `normalizeImages`，改为导入
3. `src/app/merchant/reviews/page.tsx` — 移除第 32-44 行的 `normalizeImages`，改为导入
4. `src/app/profile/reviews/page.tsx` — 替换第 46-56 行的内联逻辑，改为导入

每个文件顶部添加：
```typescript
import { normalizeImages } from '@/lib/review-utils';
```

---

## 步骤 5：添加图片加载失败回退 UI

**目标：** 图片加载失败时显示占位符，而不是破损的图标

**修改文件：** `src/app/dishes/[id]/page.tsx`（以及 `stalls/[id]/page.tsx`、`merchant/reviews/page.tsx`、`profile/reviews/page.tsx`）

在每个 `<img>` 标签中添加 `onError` 处理：

```tsx
<img
  src={url}
  alt={`评价图片 ${i + 1}`}
  className="w-full h-full object-cover"
  onError={(e) => {
    const target = e.currentTarget;
    target.style.display = 'none';
    // 或者替换为占位图
    target.src = '/placeholder-image.svg';
  }}
/>
```

或者创建一个通用的 `ReviewImage` 组件：

**新建文件：** `src/components/common/ReviewImage.tsx`

```typescript
'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ReviewImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ReviewImage({ src, alt, className = '' }: ReviewImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <ImageOff className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
```

---

## 修改顺序建议

| 顺序 | 步骤 | 依赖 | 风险 |
|------|------|------|------|
| 1 | 步骤 1（SQLite 序列化） | 无 | 低 |
| 2 | 步骤 3（serializeForJson） | 无 | 中（需测试回归） |
| 3 | 步骤 4（提取公共函数） | 无 | 低 |
| 4 | 步骤 5（图片回退 UI） | 无 | 低 |
| 5 | 步骤 2（Vercel Blob） | 需配置环境变量 | 中 |

**建议先完成步骤 1、3、4、5，再进行步骤 2（生产部署优化）。**
