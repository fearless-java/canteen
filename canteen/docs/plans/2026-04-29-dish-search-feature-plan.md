# 菜品搜索功能 — 开发计划

## 一、需求概述

将 BottomNav 「热门」( `/trending` ) 页面从占位页改造为菜品搜索页，支持用户通过关键词搜索、标签快捷查找和食堂过滤来发现菜品。

| 功能 | 说明 |
|------|------|
| **关键词搜索** | 模糊匹配菜品名称，结果按评分降序排列 |
| **预设标签** | 点击标签自动填入搜索框并触发搜索 |
| **食堂过滤** | 底部 Sheet 多选食堂，默认全选，至少留一个 |
| **搜索防抖** | 300ms |
| **结果展示** | 菜品名称 + 所属食堂 + 所属档口 + 评分 + 价格，点击跳转详情 |

---

## 二、当前状态

### 2.1 页面路由

`/trending` → `src/app/trending/page.tsx`，目前为占位页，仅显示"即将上线，敬请期待"。

### 2.2 BottomNav

`src/components/layout/BottomNav.tsx:10` — `{ href: '/trending', label: '热门', icon: Flame }`，导航无需改动。

### 2.3 现有 API

| 端点 | 说明 |
|------|------|
| `GET /dishes/:id` | 获取单菜品详情 + 档口信息 + 评价 |
| `GET /dishes?stallId=xxx` | 按档口查菜品 |
| **暂无菜品搜索端点** | **需新增** |

### 2.4 数据库 Schema

```
dishes: id, name, description, stall_id, price, image, is_available, avg_rating, total_reviews, created_at, updated_at
stalls: id, name, cafeteria_id, avg_rating, total_reviews, is_active
cafeterias: id, name
```

Relation 链：`dish → stall → cafeteria`

### 2.5 同项目参照

- `src/app/page.tsx:87-124` — `StallListItem` 列表项样式（圆角头像 + 名称 + 食堂 + 评分 + 评价数）
- `src/app/dishes/[id]/page.tsx` — 菜品详情页，可跳转目标
- `src/components/ui/sheet.tsx` — shadcn Sheet 组件，用于食堂过滤弹窗
- `src/app/api/routes/dishes.ts` — 已有菜品相关端点，在此新增搜索端点

---

## 三、后端方案

### 3.1 新增端点

**`GET /dishes/search`**

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `q` | string | 是 | 搜索关键词，空值返回空数组 |
| `cafeteriaIds` | string | 否 | 逗号分隔的食堂 ID，不传则搜全部 |

返回结构：

```typescript
{
  success: true,
  data: Array<{
    id: string;
    name: string;
    avgRating: string;
    totalReviews: number;
    price: string;
    image?: string;
    isAvailable: boolean;
    stall: {
      id: string;
      name: string;
      cafeteria: {
        id: string;
        name: string;
      };
    };
  }>,
}
```

### 3.2 实现逻辑（`src/app/api/routes/dishes.ts` 新增）

```typescript
app.get('/dishes/search', async (c) => {
  const q = c.req.query('q')?.trim();
  const cafeteriaIds = c.req.query('cafeteriaIds');

  if (!q) {
    return c.json({ success: true, data: [] });
  }

  const conditions = [like(dishes.name, `%${q}%`)];

  if (cafeteriaIds) {
    const ids = cafeteriaIds.split(',').filter(Boolean);
    if (ids.length > 0) {
      const stallsInCafeteria = await (db as any).query.stalls.findMany({
        where: inArray(stalls.cafeteriaId, ids),
        columns: { id: true },
      });
      const stallIds = stallsInCafeteria.map((s: any) => s.id);
      if (stallIds.length > 0) {
        conditions.push(inArray(dishes.stallId, stallIds));
      }
    }
  }

  const data = await withRetry(() =>
    (db as any).query.dishes.findMany({
      where: and(...conditions),
      with: {
        stall: {
          with: {
            cafeteria: true,
          },
        },
      },
      orderBy: desc(dishes.avgRating),
      limit: 50,
    })
  );

  return c.json({ success: true, data: serializeForJson(data) });
});
```

**关键设计决策：**
- 使用 Drizzle query API + relations，天然兼容 PostgreSQL 和 SQLite 双 provider
- 食堂过滤通过先查 stall IDs 再 `inArray` 实现，避免跨表 JOIN 导致 provider 兼容问题
- `limit: 50` 防止返回过多数据
- 关键词为空时直接返回空数组，避免无意义全表扫描

### 3.3 导入变更

在 `dishes.ts` 顶部新增导入：

```typescript
import { like, and, inArray } from 'drizzle-orm';
// 已有: import { dishes, stalls, reviews } from '@/db/schema';
// stalls 已导入
```

---

## 四、前端方案

### 4.1 页面结构 (`src/app/trending/page.tsx`)

```
┌──────────────────────────────────────┐
│  ← 热门                          🔍  │  ← Header: 标题 + 食堂过滤按钮(显示已选数)
├──────────────────────────────────────┤
│  🔍 搜索菜品名称...                    │  ← SearchInput (受控组件, 300ms debounce)
├──────────────────────────────────────┤
│  面食 米饭 烧烤 小吃 麻辣 甜品 饮品 快餐 │  ← 预设标签行 (水平滚动)
├──────────────────────────────────────┤
│                                      │
│  ┌ 初始状态/空搜索 ────────────────┐  │
│  │ 📖 搜索你想找的菜品              │  │
│  │    或点击下方标签快速查找         │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌ 搜索结果 ──────────────────────┐  │
│  │ [img] 鱼香肉丝盖饭         ⭐4.2│  │  ← DishSearchItem
│  │       东一食堂 · 风味小厨  ¥18  │  │     Link → /dishes/[id]
│  │       128条评价                 │  │
│  ├────────────────────────────────┤  │
│  │ [img] 麻辣香锅             ⭐4.8│  │
│  │       东二食堂 · 川味轩    ¥35  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌ 加载中 ────────────────────────┐  │
│  │ [=====] [====] [====] [===]   │  │  ← Skeleton × 3
│  └────────────────────────────────┘  │
│                                      │
│  ┌ 无结果 ────────────────────────┐  │
│  │ 🔍 未找到与「xxx」相关的菜品   │  │
│  │    试试其他关键词或标签         │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌ 错误状态 ──────────────────────┐  │
│  │ ⚠️ 加载失败                     │  │
│  │ [重新加载]                      │  │
│  └────────────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤
│              [BottomNav]              │
└──────────────────────────────────────┘
```

### 4.2 组件树

```
TrendingPage
├── Header (标题 + 过滤按钮)
├── SearchInput (受控 + useDebounce)
├── PresetTags (预设标签行)
├── CafeteriaFilterSheet (底部弹窗多选)
└── Results
    ├── LoadingState (Skeleton × 3)
    ├── EmptyState (搜索提示)
    ├── NoResultsState (无结果提示)
    ├── ErrorState (错误 + 重试)
    └── DishSearchItem × N (结果列表)
```

### 4.3 组件设计

#### SearchInput

| 属性 | 实现 |
|------|------|
| 类型 | 受控 input + 清空按钮 |
| 占位符 | `搜索菜品名称...` |
| 防抖 | 自定义 `useDebounce` hook，300ms |
| 清空 | 右侧 X 按钮，清空后清除搜索结果 |

**防抖实现：**
```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
```

#### PresetTags

静态配置数组，从预设列表中渲染标签按钮。

```typescript
const PRESET_TAGS = ['面食', '米饭', '烧烤', '小吃', '麻辣', '甜品', '饮品', '快餐'];
```

行为：
- 点击后设置搜索框值为标签文本
- 同时触发防抖搜索
- 当前搜索关键词与标签匹配时，该标签高亮

#### CafeteriaFilterSheet

使用 shadcn Sheet 组件。

行为：
- 过滤按钮显示当前已选数，如 `食堂 4/4` 或 `食堂 3/4`
- 点击打开底部 Sheet
- Sheet 内列出所有食堂 + 全选项
- 每个食堂为 toggle chip，选中高亮，未选中灰色
- 最后一项不可取消（禁用点击或显示提示）
- 关闭 Sheet 后立即更新搜索结果（如果有搜索关键词）
- Sheet 标题：选择食堂
- Sheet 底部：确认按钮

#### DishSearchItem

| 区域 | 内容 |
|------|------|
| 左侧 | 菜品图片（或占位图标，32×32 圆角） |
| 中间 | 菜品名称（加粗） + 食堂名·档口名（灰色小字）+ 评分 + 评价数 + 价格 |
| 右侧 | 箭头 `>` 或评分徽章 |

### 4.4 状态管理

| 状态 | 条件 | 展示 |
|------|------|------|
| `initial` | `query === ''` 且 `!debouncedQuery` | 提示文字 + 标签推荐 |
| `loading` | `isFetching` | 3 个 Skeleton 条目 |
| `success (empty)` | `data.length === 0` | "未找到相关菜品" |
| `success (data)` | `data.length > 0` | DishSearchItem 列表 |
| `error` | `isError` | 错误信息 + 重试按钮 |

### 4.5 数据流

```
用户输入/点击标签
    │
    ▼
searchQuery (useState)
    │
    ▼
debouncedQuery (useDebounce, 300ms)
    │
    ▼
useQuery({
  queryKey: ['dishes', 'search', debouncedQuery, selectedCafeteriaIds],
  queryFn: fetch(`/api/dishes/search?q=${debouncedQuery}&cafeteriaIds=${ids}`),
  enabled: debouncedQuery.length > 0,
})
    │
    ▼
渲染搜索结果
```

### 4.6 新建文件清单

| 操作 | 文件路径 | 说明 |
|------|----------|------|
| **修改** | `src/app/api/routes/dishes.ts` | 新增 `GET /dishes/search` |
| **修改** | `src/app/trending/page.tsx` | 完整重写为搜索页 |
| **新建** | `src/components/features/trending/DishSearchItem.tsx` | 搜索结果单项 |
| **新建** | `src/components/features/trending/CafeteriaFilterSheet.tsx` | 食堂过滤弹窗 |
| **无需修改** | `src/components/layout/BottomNav.tsx` | 导航路径不变 |
| **无需修改** | `src/app/dishes/[id]/page.tsx` | 详情页不变 |

---

## 五、详细验收标准

### 5.1 API 验收

| # | 验收项 | 验证方式 |
|---|--------|---------|
| A1 | `GET /dishes/search?q=鱼香` 返回包含"鱼香"的菜品列表 | 响应 `data` 数组非空，每个 item 的 name 含"鱼香" |
| A2 | 返回结果包含 stall（含 cafeteria）嵌套信息 | 每个 item 有 `stall.name`、`stall.cafeteria.name` |
| A3 | 结果按 avgRating 降序排列 | 遍历验证评分不递增 |
| A4 | `q` 为空时返回空数组 | `?q=` → `{ data: [] }` |
| A5 | `cafeteriaIds` 过滤生效 | `?q=xxx&cafeteriaIds=东一_id` → 只返回东一食堂的结果 |
| A6 | 最多返回 50 条 | 任意搜索返回结果 ≤ 50 |
| A7 | SQLite 兼容 | `bun run dev:local` 下搜索正常 |

### 5.2 搜索功能验收

| # | 验收项 | 验证方式 |
|---|--------|---------|
| B1 | 输入关键词 300ms 后发起请求 | 网络面板确认请求在停止输入 300ms 后发出 |
| B2 | 连续输入只发一次请求 | 快速输入"鱼香肉丝"只触发 1 次请求 |
| B3 | 清空搜索框 → 清除结果回到初始态 | 点 X 后结果区显示提示文字 |
| B4 | 搜索框右侧有清空按钮 | 有内容时显示 X 图标，点击清空 |

### 5.3 标签功能验收

| # | 验收项 | 验证方式 |
|---|--------|---------|
| C1 | 8 个标签正确显示 | 页面显示"面食/米饭/烧烤/小吃/麻辣/甜品/饮品/快餐" |
| C2 | 点击标签 → 填入搜索框并触发搜索 | 点击"烧烤" → 搜索框值为"烧烤" → 300ms 后搜索 |
| C3 | 点击标签后搜索框可继续编辑 | 填入"烧烤"后可继续输入"烤串" → 搜索"烧烤烤串" |

### 5.4 食堂过滤验收

| # | 验收项 | 验证方式 |
|---|--------|---------|
| D1 | 过滤按钮显示在 Header 区域 | 页面顶部可见过滤图标/按钮 |
| D2 | 点击打开底部 Sheet | Sheet 从底部弹出，显示所有食堂列表 |
| D3 | 默认全部选中 | 首次打开所有食堂为选中状态 |
| D4 | 点击取消某个食堂 | 该食堂切换为未选中状态，过滤按钮计数更新 |
| D5 | 最后一个不可取消 | 只剩 1 个时点击无效或禁用，提示"至少保留一个食堂" |
| D6 | 关闭 Sheet 后刷新搜索结果 | 已有搜索关键词时，过滤变更后重新请求 |
| D7 | 不传 cafeteriaIds 时搜索全部 | 全部选中时请求不带 cafeteriaIds 参数 |

### 5.5 结果展示验收

| # | 验收项 | 验证方式 |
|---|--------|---------|
| E1 | 每条结果展示菜品名称 | 加粗显示 dish.name |
| E2 | 每条结果展示食堂名 · 档口名 | 灰字显示 "东一食堂 · 风味小厨" |
| E3 | 每条结果展示评分 | 显示星星 + 分数 |
| E4 | 每条结果展示价格 | 显示 ¥价格 |
| E5 | 每条结果展示评价数 | 显示 "N条评价" |
| E6 | 售罄菜品有标识 | `isAvailable === false` 显示"暂时售罄"标签 |
| E7 | 点击结果跳转到 `/dishes/[id]` | 跳转后显示该菜品详情页 |

### 5.6 各状态验收

| # | 验收项 | 验证方式 |
|---|--------|---------|
| F1 | 初始状态显示搜索提示 | 未输入时显示"搜索你想找的菜品，或点击下方标签快速查找" |
| F2 | 加载状态显示骨架屏 | 请求进行中显示 3 个灰色骨架条 |
| F3 | 无结果状态 | 搜索"xyz不存在的菜品" → 显示"未找到相关菜品" |
| F4 | 错误状态显示重试按钮 | 断网后搜索 → 显示错误信息 + 点击重试 |

### 5.7 构建/兼容验收

| # | 验收项 | 验证方式 |
|---|--------|---------|
| G1 | 构建无报错 | `bun run build` 通过 |
| G2 | ESLint 无报错 | `bun run lint` 通过 |
| G3 | SQLite 兼容 | `bun run dev:local` 下所有功能正常 |

---

## 六、实施步骤

### Step 1: 新增搜索 API 端点

**文件：** `src/app/api/routes/dishes.ts`

- 导入 `like`, `and`, `inArray` from `drizzle-orm`
- 在已有 `GET /dishes` 和 `GET /dishes/:id` 后新增 `GET /dishes/search` 路由
- 实现模糊搜索逻辑 + 食堂过滤 + 评分排序
- 使用 `serializeForJson()` 处理返回值

### Step 2: 新建 DishSearchItem 组件

**文件：** `src/components/features/trending/DishSearchItem.tsx`

- 定义 `DishSearchResult` 接口
- 左侧菜品图片（或灰色占位）
- 中间：菜品名 + 食堂·档口 + 评分 + 评价数 + 价格
- 售罄菜品标记
- 整行可点击，Link 到 `/dishes/[id]`
- 使用 framer-motion 入场动画

### Step 3: 新建 CafeteriaFilterSheet 组件

**文件：** `src/components/features/trending/CafeteriaFilterSheet.tsx`

- 接收 cafeteria 列表、已选 IDs、onChange 回调
- 使用 shadcn Sheet 组件
- 每个食堂一行 toggle chip
- 最后一项不可取消逻辑
- 确认按钮
- 默认全选

### Step 4: 重写 TrendingPage

**文件：** `src/app/trending/page.tsx`

- useQuery 获取 cafeteria 列表（复用现有 `/api/cafeterias`）
- 搜索框 + useDebounce
- PresetTags 行
- 条件渲染各状态（initial / loading / success / error / empty）
- 传递过滤参数给 API 请求
- 包含 BottomNav

### Step 5: 验证

- `bun run build` 构建验证
- `bun run lint` 代码检查
- `bun run dev:local` SQLite 兼容验证
- 手动走查验收标准 A1-G3

---

## 七、与现有功能的关系

### 不影响的模块

| 模块 | 原因 |
|------|------|
| 首页 `page.tsx` "热门" Tab 热档口排行 | 独立功能，位于首页 |
| 菜品详情页 `dishes/[id]` | 搜索跳转目标，无需修改 |
| BottomNav `BottomNav.tsx` | 路由 `/trending` 不变 |
| 其他 API 端点 | 仅新增 `/dishes/search`，不修改现有逻辑 |

### 可能的交互冲突

- 首页 "热门" Tab 和 BottomNav "热门" 页面是两个独立入口，用户感知上不冲突
- 搜索功能不涉及写操作，无需考虑 auth 和权限
