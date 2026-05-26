#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { resolve } from 'path';

const dbPath = process.env.LOCAL_DB_PATH || resolve(process.cwd(), 'data/local.db');

console.log('🔧 初始化本地 SQLite 数据库...');
console.log(`📁 数据库路径: ${dbPath}`);

const sqlite = new Database(dbPath);
sqlite.exec('PRAGMA foreign_keys = ON;');

const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Cafeterias table
CREATE TABLE IF NOT EXISTS cafeterias (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  image TEXT,
  "order" INTEGER DEFAULT 0 NOT NULL
);

-- Stalls table
CREATE TABLE IF NOT EXISTS stalls (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  cafeteria_id TEXT NOT NULL,
  merchant_id TEXT,
  image TEXT,
  avg_rating TEXT DEFAULT '0' NOT NULL,
  total_reviews INTEGER DEFAULT 0 NOT NULL,
  total_views INTEGER DEFAULT 0 NOT NULL,
  is_active INTEGER DEFAULT 1 NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (cafeteria_id) REFERENCES cafeterias(id),
  FOREIGN KEY (merchant_id) REFERENCES users(id)
);

-- Dishes table
CREATE TABLE IF NOT EXISTS dishes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stall_id TEXT NOT NULL,
  price TEXT NOT NULL,
  image TEXT,
  is_available INTEGER DEFAULT 1 NOT NULL,
  avg_rating TEXT DEFAULT '0' NOT NULL,
  total_reviews INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (stall_id) REFERENCES stalls(id)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  stall_id TEXT NOT NULL,
  dish_id TEXT,
  rating INTEGER NOT NULL,
  content TEXT NOT NULL,
  images TEXT DEFAULT '[]' NOT NULL,
  likes INTEGER DEFAULT 0 NOT NULL,
  merchant_reply TEXT,
  replied_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (stall_id) REFERENCES stalls(id),
  FOREIGN KEY (dish_id) REFERENCES dishes(id)
);

-- Review likes table
CREATE TABLE IF NOT EXISTS review_likes (
  review_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (review_id, student_id),
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stall_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (stall_id) REFERENCES stalls(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ranking snapshots table
CREATE TABLE IF NOT EXISTS ranking_snapshots (
  id TEXT PRIMARY KEY,
  stall_id TEXT NOT NULL,
  score REAL NOT NULL,
  rank INTEGER NOT NULL,
  avg_rating TEXT NOT NULL,
  total_reviews INTEGER NOT NULL,
  total_views INTEGER NOT NULL,
  snapshot_date TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (stall_id) REFERENCES stalls(id)
);
`;

console.log('📋 创建表结构...');
sqlite.exec(schema);

console.log('✅ 数据库初始化完成！');

const tables = sqlite.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
).all();

console.log('\n📊 已创建的表:');
tables.forEach((t: any) => console.log(`  - ${t.name}`));

sqlite.close();
console.log('\n🎉 本地数据库已就绪！');
console.log('\n下一步:');
console.log('  1. bun run db:seed:local    # 插入测试数据');
console.log('  2. bun run dev:local          # 启动本地开发服务器');
