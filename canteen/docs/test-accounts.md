# 测试账号

## 商户账号 (Merchant)

| 邮箱 | 密码 | 姓名 |
|------|------|------|
| merchant1@example.com | password123 | 张老板 |
| merchant2@example.com | password123 | 李老板 |
| merchant3@example.com | password123 | 王老板 |
| merchant4@example.com | password123 | 刘老板 |
| merchant5@example.com | password123 | 陈老板 |

## 学生账号 (Student)

| 邮箱 | 密码 | 姓名 |
|------|------|------|
| student1@example.com | password123 | 小明 |
| student2@example.com | password123 | 小红 |
| student3@example.com | password123 | 小李 |
| student4@example.com | password123 | 小王 |
| student5@example.com | password123 | 小张 |

## 测试账号 (Test)

| 邮箱 | 密码 | 用途 |
|------|------|------|
| test_${Date.now()}@example.com | test123 | 动态测试用户 |
| tx_test@example.com | test | 事务回滚测试 |

## 账号来源

- 商户和学生账号：运行 `npm run db:seed` 或 `npm run db:seed:local` 时自动创建
- 测试账号：在 `src/db/test-local.ts` 中定义，用于单元测试

## 注意事项

1. 所有测试账号密码均为 `password123` 或 `test123`，**请勿在生产环境使用**
2. 测试账号仅供开发和测试使用
