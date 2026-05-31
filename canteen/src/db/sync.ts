#!/usr/bin/env tsx

import { db } from './index';
import * as pgSchema from './schema';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import * as sqliteSchema from './schema.sqlite';
import { resolve } from 'path';
import { eq } from 'drizzle-orm';

const action = process.argv[2];
const direction = process.argv[3] as 'to-neon' | 'to-local' | undefined;

if (!action || action === 'help') {
  console.log(`
数据库同步工具

用法:
  bun run db:sync export          导出 Neon 数据到 JSON
  bun run db:sync import          从 JSON 导入到当前数据库
  bun run db:sync migrate to-local   从 Neon 迁移到本地 SQLite
  bun run db:sync migrate to-neon    从 SQLite 迁移到 Neon
  bun run db:sync backup         备份当前数据库到 JSON

环境变量:
  DB_PROVIDER=neon|local         设置当前数据库
  DATABASE_URL                   Neon 连接字符串
  LOCAL_DB_PATH                  SQLite 文件路径
`);
  process.exit(0);
}

const DATA_FILE = resolve(process.cwd(), 'data/db-backup.json');

async function exportToJson() {
  console.log('📤 导出数据到 JSON...');
  
  const data = {
    users: await db.select().from(pgSchema.users),
    cafeterias: await db.select().from(pgSchema.cafeterias),
    stalls: await db.select().from(pgSchema.stalls),
    dishes: await db.select().from(pgSchema.dishes),
    reviews: await db.select().from(pgSchema.reviews),
    reviewLikes: await db.select().from(pgSchema.reviewLikes),
    favorites: await db.select().from(pgSchema.favorites),
    messages: await db.select().from(pgSchema.messages),
  };
  
  await Bun.write(DATA_FILE, JSON.stringify(data, null, 2));
  console.log(`✅ 已导出到 ${DATA_FILE}`);
  console.log(`   - ${data.users.length} 用户`);
  console.log(`   - ${data.cafeterias.length} 食堂`);
  console.log(`   - ${data.stalls.length} 档口`);
  console.log(`   - ${data.dishes.length} 菜品`);
  console.log(`   - ${data.reviews.length} 评价`);
}

async function migrateToLocal() {
  console.log('🔄 从 Neon 迁移到本地 SQLite...');
  
  const dbPath = process.env.LOCAL_DB_PATH || resolve(process.cwd(), 'data/local.db');
  const sqlite = new Database(dbPath);
  sqlite.exec('PRAGMA foreign_keys = OFF;');
  
  const sqliteDb = drizzleSqlite(sqlite, { schema: sqliteSchema });
  
  console.log('📥 导出 Neon 数据...');
  const data = {
    users: await db.select().from(pgSchema.users),
    cafeterias: await db.select().from(pgSchema.cafeterias),
    stalls: await db.select().from(pgSchema.stalls),
    dishes: await db.select().from(pgSchema.dishes),
    reviews: await db.select().from(pgSchema.reviews),
    reviewLikes: await db.select().from(pgSchema.reviewLikes),
    favorites: await db.select().from(pgSchema.favorites),
    messages: await db.select().from(pgSchema.messages),
  };
  
  console.log('🗑️ 清空本地数据库...');
  sqlite.exec('DELETE FROM review_likes;');
  sqlite.exec('DELETE FROM favorites;');
  sqlite.exec('DELETE FROM messages;');
  sqlite.exec('DELETE FROM reviews;');
  sqlite.exec('DELETE FROM dishes;');
  sqlite.exec('DELETE FROM stalls;');
  sqlite.exec('DELETE FROM cafeterias;');
  sqlite.exec('DELETE FROM users;');
  
  console.log('📤 导入到 SQLite...');
  
  for (const user of data.users) {
    sqliteDb.insert(sqliteSchema.users).values({
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    }).run();
  }
  console.log(`   ✅ ${data.users.length} 用户`);
  
  for (const item of data.cafeterias) {
    sqliteDb.insert(sqliteSchema.cafeterias).values(item).run();
  }
  console.log(`   ✅ ${data.cafeterias.length} 食堂`);
  
  for (const item of data.stalls) {
    sqliteDb.insert(sqliteSchema.stalls).values({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }).run();
  }
  console.log(`   ✅ ${data.stalls.length} 档口`);
  
  for (const item of data.dishes) {
    sqliteDb.insert(sqliteSchema.dishes).values({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }).run();
  }
  console.log(`   ✅ ${data.dishes.length} 菜品`);
  
  for (const item of data.reviews) {
    sqliteDb.insert(sqliteSchema.reviews).values({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      repliedAt: item.repliedAt ? new Date(item.repliedAt) : null,
    }).run();
  }
  console.log(`   ✅ ${data.reviews.length} 评价`);
  
  for (const item of data.reviewLikes) {
    sqliteDb.insert(sqliteSchema.reviewLikes).values({
      ...item,
      createdAt: new Date(item.createdAt),
    }).run();
  }
  console.log(`   ✅ ${data.reviewLikes.length} 点赞`);
  
  for (const item of data.favorites) {
    sqliteDb.insert(sqliteSchema.favorites).values({
      ...item,
      createdAt: new Date(item.createdAt),
    }).run();
  }
  console.log(`   ✅ ${data.favorites.length} 收藏`);
  
  for (const item of data.messages) {
    sqliteDb.insert(sqliteSchema.messages).values({
      ...item,
      actorAvatar: item.actorAvatar || null,
      linkType: item.linkType || null,
      linkId: item.linkId || null,
      createdAt: new Date(item.createdAt),
    }).run();
  }
  console.log(`   ✅ ${data.messages.length} 消息`);
  
  sqlite.exec('PRAGMA foreign_keys = ON;');
  sqlite.close();
  
  console.log(`\n✅ 迁移完成！数据库保存在: ${dbPath}`);
  console.log('\n切换到本地数据库运行:');
  console.log('  DB_PROVIDER=local bun dev');
}

async function main() {
  try {
    switch (action) {
      case 'export':
        await exportToJson();
        break;
      case 'migrate':
        if (direction === 'to-local') {
          await migrateToLocal();
        } else if (direction === 'to-neon') {
          console.log('迁移到 Neon 功能待实现（推荐在 Neon 控制台导入）');
        } else {
          console.log('请指定方向: to-local 或 to-neon');
        }
        break;
      default:
        console.log('未知命令，使用 help 查看用法');
    }
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

main();
