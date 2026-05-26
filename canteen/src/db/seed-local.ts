#!/usr/bin/env tsx

import { db, isLocalDB } from './index';
import * as sqliteSchema from './schema.sqlite';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

function generateUUID() {
  return crypto.randomUUID();
}

function calculateStallScore(avgRating: number, totalReviews: number, totalViews: number): number {
  const ratingScore = avgRating * 20;
  const reviewWeight = Math.min(1.0, 0.7 + (Math.log(totalReviews + 1) / Math.log(100)) * 0.3);
  const viewWeight = Math.min(1.0, 0.85 + (Math.log(totalViews + 1) / Math.log(500)) * 0.15);
  return ratingScore * reviewWeight * viewWeight;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function seedLocal() {
  console.log('🌱 Seeding local SQLite database...');

  const now = new Date();

  const cafeteriaData = [
    { id: generateUUID(), name: '东一食堂', description: '东区第一食堂，以川菜和家常菜为主', location: '东区学生宿舍区', order: 1 },
    { id: generateUUID(), name: '东二食堂', description: '东区第二食堂，特色是面食和烧烤', location: '东区教学楼旁', order: 2 },
    { id: generateUUID(), name: '北一食堂', description: '北区第一食堂，以湘菜和快餐为主', location: '北区宿舍区', order: 3 },
    { id: generateUUID(), name: '北二食堂', description: '北区第二食堂，提供各地特色小吃', location: '北区图书馆旁', order: 4 },
  ];

  for (const item of cafeteriaData) {
    await db.insert(sqliteSchema.cafeterias).values(item);
  }
  console.log(`✅ Inserted ${cafeteriaData.length} cafeterias`);

  const insertedCafeterias = await db.select().from(sqliteSchema.cafeterias);

  const hashedPassword = await bcrypt.hash('password123', 10);
  const nowMs = now.getTime();
  
  const merchantData = [
    { id: generateUUID(), email: 'merchant1@example.com', password: hashedPassword, role: 'merchant' as const, name: '张老板', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), email: 'merchant2@example.com', password: hashedPassword, role: 'merchant' as const, name: '李老板', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), email: 'merchant3@example.com', password: hashedPassword, role: 'merchant' as const, name: '王老板', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), email: 'merchant4@example.com', password: hashedPassword, role: 'merchant' as const, name: '刘老板', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), email: 'merchant5@example.com', password: hashedPassword, role: 'merchant' as const, name: '陈老板', createdAt: nowMs, updatedAt: nowMs },
  ];

  for (const item of merchantData) {
    await db.insert(sqliteSchema.users).values(item);
  }
  console.log(`✅ Inserted ${merchantData.length} merchants`);

  const studentData = [
    { id: generateUUID(), email: 'student1@example.com', password: hashedPassword, role: 'student' as const, name: '小明', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), email: 'student2@example.com', password: hashedPassword, role: 'student' as const, name: '小红', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), email: 'student3@example.com', password: hashedPassword, role: 'student' as const, name: '小李', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), email: 'student4@example.com', password: hashedPassword, role: 'student' as const, name: '小王', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), email: 'student5@example.com', password: hashedPassword, role: 'student' as const, name: '小张', createdAt: nowMs, updatedAt: nowMs },
  ];

  for (const item of studentData) {
    await db.insert(sqliteSchema.users).values(item);
  }
  console.log(`✅ Inserted ${studentData.length} students`);

  const merchants = await db.select().from(sqliteSchema.users).where(eq(sqliteSchema.users.role, 'merchant'));
  const students = await db.select().from(sqliteSchema.users).where(eq(sqliteSchema.users.role, 'student'));

  const stallData = [
    { id: generateUUID(), name: '川味小炒', description: '正宗四川口味，麻辣鲜香', cafeteriaId: insertedCafeterias[0].id, merchantId: merchants[0]?.id, avgRating: '0', totalReviews: 0, totalViews: 0, isActive: true, image: '/api/uploads/chuan-wei-xiao-chao.jpg', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), name: '家常快餐', description: '营养均衡，价格实惠', cafeteriaId: insertedCafeterias[0].id, merchantId: merchants[1]?.id, avgRating: '0', totalReviews: 0, totalViews: 0, isActive: true, image: '/api/uploads/jia-chang-kuai-can.jpg', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), name: '麻辣烫', description: '自选菜品，汤底浓郁', cafeteriaId: insertedCafeterias[0].id, avgRating: '0', totalReviews: 0, totalViews: 0, isActive: true, image: '/api/uploads/ma-la-tang.jpg', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), name: '重庆小面', description: '地道重庆风味', cafeteriaId: insertedCafeterias[1].id, merchantId: merchants[2]?.id, avgRating: '0', totalReviews: 0, totalViews: 0, isActive: true, image: '/api/uploads/chong-qing-xiao-mian.jpg', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), name: '烧烤档', description: '夜宵首选', cafeteriaId: insertedCafeterias[1].id, avgRating: '0', totalReviews: 0, totalViews: 0, isActive: true, image: '/api/uploads/shao-kao-dang.jpg', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), name: '湘菜馆', description: '湖南特色，辣得过瘾', cafeteriaId: insertedCafeterias[2].id, merchantId: merchants[3]?.id, avgRating: '0', totalReviews: 0, totalViews: 0, isActive: true, image: '/api/uploads/xiang-cai-guan.jpg', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), name: '小吃街', description: '各地特色小吃汇集', cafeteriaId: insertedCafeterias[3].id, merchantId: merchants[4]?.id, avgRating: '0', totalReviews: 0, totalViews: 0, isActive: true, image: '/api/uploads/xiao-chi-jie.jpg', createdAt: nowMs, updatedAt: nowMs },
  ];

  for (const item of stallData) {
    await db.insert(sqliteSchema.stalls).values(item);
  }
  console.log(`✅ Inserted ${stallData.length} stalls`);

  const insertedStalls = await db.select().from(sqliteSchema.stalls);

  const dishData = [
    { id: generateUUID(), name: '宫保鸡丁', description: '经典川菜', price: '18.00', stallId: insertedStalls[0].id, avgRating: '0', totalReviews: 0, isAvailable: true, image: '/api/uploads/gong-bao-ji-ding.jpg', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), name: '麻婆豆腐', description: '麻辣鲜香', price: '12.00', stallId: insertedStalls[0].id, avgRating: '0', totalReviews: 0, isAvailable: true, image: '/api/uploads/ma-po-dou-fu.jpg', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), name: '重庆小面', description: '麻辣鲜香', price: '10.00', stallId: insertedStalls[3].id, avgRating: '0', totalReviews: 0, isAvailable: true, image: '/api/uploads/chong-qing-xiao-mian.jpg', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), name: '羊肉串', description: '肉质鲜嫩', price: '4.00', stallId: insertedStalls[4].id, avgRating: '0', totalReviews: 0, isAvailable: true, image: '/api/uploads/yang-rou-chuan.jpg', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), name: '剁椒鱼头', description: '湘菜代表', price: '38.00', stallId: insertedStalls[5].id, avgRating: '0', totalReviews: 0, isAvailable: true, image: '/api/uploads/duo-jiao-yu-tou.jpg', createdAt: nowMs, updatedAt: nowMs },
    { id: generateUUID(), name: '臭豆腐', description: '闻着臭吃着香', price: '10.00', stallId: insertedStalls[6].id, avgRating: '0', totalReviews: 0, isAvailable: true, image: '/api/uploads/chou-dou-fu.jpg', createdAt: nowMs, updatedAt: nowMs },
  ];

  for (const item of dishData) {
    await db.insert(sqliteSchema.dishes).values(item);
  }
  console.log(`✅ Inserted ${dishData.length} dishes`);

  const insertedDishes = await db.select().from(sqliteSchema.dishes);

  const reviewContents = [
    '味道很好，下次还会再来！',
    '价格实惠，分量足，推荐！',
    '口味正宗，老板人很好',
    '排队的人有点多，但值得等待',
    '环境干净卫生，菜品新鲜',
    '分量很足，性价比高',
    '上菜速度快，服务态度好',
    '招牌菜必点，真的好吃',
    '朋友推荐的，没有失望',
    '午饭首选，每天都想吃',
    '比其他家好吃太多了',
    '菜品种类丰富，选择多',
    '适合学生党的价格',
    '味道偏淡了一点，整体还行',
    '第一次尝试，感觉不错',
  ];

  const merchantStalls = insertedStalls.filter((s) => s.merchantId);
  
  const reviewConfigs = [
    { daysAgo: 0, countPerStall: 3 },
    { daysAgo: 1, countPerStall: 4 },
    { daysAgo: 2, countPerStall: 3 },
    { daysAgo: 3, countPerStall: 2 },
    { daysAgo: 4, countPerStall: 3 },
    { daysAgo: 5, countPerStall: 2 },
    { daysAgo: 6, countPerStall: 4 },
  ];

  let reviewCount = 0;
  const reviewsByStall: Record<string, { rating: number; createdAt: number }[]> = {};

  for (const config of reviewConfigs) {
    const reviewDate = new Date(now);
    reviewDate.setDate(reviewDate.getDate() - config.daysAgo);
    
    for (const stall of merchantStalls) {
      for (let i = 0; i < config.countPerStall; i++) {
        const randomStudent = students[Math.floor(Math.random() * students.length)];
        const randomRating = Math.floor(Math.random() * 5) + 1; // 1-5
        const randomContent = reviewContents[Math.floor(Math.random() * reviewContents.length)];
        const randomHour = Math.floor(Math.random() * 12) + 8;
        const randomMinute = Math.floor(Math.random() * 60);
        
        const reviewTime = new Date(reviewDate);
        reviewTime.setHours(randomHour, randomMinute, 0, 0);
        const reviewTimeMs = reviewTime.getTime();

        await db.insert(sqliteSchema.reviews).values({
          id: generateUUID(),
          studentId: randomStudent.id,
          stallId: stall.id,
          rating: randomRating,
          content: randomContent,
          images: '[]',
          likes: Math.floor(Math.random() * 50),
          createdAt: reviewTimeMs,
          updatedAt: reviewTimeMs,
        });

        if (!reviewsByStall[stall.id]) reviewsByStall[stall.id] = [];
        reviewsByStall[stall.id].push({ rating: randomRating, createdAt: reviewTimeMs });

        reviewCount++;
      }
    }
  }
  console.log(`✅ Inserted ${reviewCount} reviews across 7 days`);

  // Compute real stats for stalls from reviews
  for (const stall of insertedStalls) {
    const stallReviews = reviewsByStall[stall.id] || [];
    if (stallReviews.length > 0) {
      const avgRating = stallReviews.reduce((sum, r) => sum + r.rating, 0) / stallReviews.length;
      const totalViews = Math.floor(Math.random() * 450) + 50;
      await db.update(sqliteSchema.stalls).set({
        avgRating: avgRating.toFixed(1),
        totalReviews: stallReviews.length,
        totalViews,
        updatedAt: nowMs,
      }).where(eq(sqliteSchema.stalls.id, stall.id));
    }
  }
  console.log('✅ Computed stall stats from reviews');

  // Compute real stats for dishes from reviews (assign some reviews to dishes)
  for (const dish of insertedDishes) {
    const stallReviews = reviewsByStall[dish.stallId] || [];
    // Assign ~60% of stall reviews to dishes, split among dishes for that stall
    const dishesForStall = insertedDishes.filter(d => d.stallId === dish.stallId);
    const dishReviewCount = Math.floor(stallReviews.length * 0.6 / dishesForStall.length);
    const dishReviews = stallReviews.slice(0, dishReviewCount);
    
    if (dishReviews.length > 0) {
      const avgRating = dishReviews.reduce((sum, r) => sum + r.rating, 0) / dishReviews.length;
      await db.update(sqliteSchema.dishes).set({
        avgRating: avgRating.toFixed(1),
        totalReviews: dishReviews.length,
        updatedAt: nowMs,
      }).where(eq(sqliteSchema.dishes.id, dish.id));
    }
  }
  console.log('✅ Computed dish stats from reviews');

  // Generate favorites
  let favCount = 0;
  for (const student of students) {
    const favCountForStudent = Math.floor(Math.random() * 3) + 2;
    const shuffled = [...merchantStalls].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(favCountForStudent, shuffled.length); i++) {
      await db.insert(sqliteSchema.favorites).values({
        id: generateUUID(),
        userId: student.id,
        stallId: shuffled[i].id,
        createdAt: nowMs,
      });
      favCount++;
    }
  }
  console.log(`✅ Inserted ${favCount} favorites`);

  // Insert ranking snapshots for today and yesterday
  const updatedStalls = await db.select().from(sqliteSchema.stalls);
  
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayStr = formatDate(today);
  const yesterdayStr = formatDate(yesterday);

  // Calculate scores and sort for today
  const stallScores = updatedStalls
    .filter(s => s.totalReviews > 0)
    .map(stall => ({
      id: stall.id,
      score: calculateStallScore(parseFloat(stall.avgRating), stall.totalReviews, stall.totalViews),
      avgRating: stall.avgRating,
      totalReviews: stall.totalReviews,
      totalViews: stall.totalViews,
    }))
    .sort((a, b) => b.score - a.score);

  // Today's snapshot
  for (let i = 0; i < stallScores.length; i++) {
    const stall = stallScores[i];
    await db.insert(sqliteSchema.rankingSnapshots).values({
      id: generateUUID(),
      stallId: stall.id,
      score: stall.score,
      rank: i + 1,
      avgRating: stall.avgRating,
      totalReviews: stall.totalReviews,
      totalViews: stall.totalViews,
      snapshotDate: todayStr,
      createdAt: nowMs,
    });
  }

  // Yesterday's snapshot (slightly different scores to simulate change)
  const yesterdayScores = stallScores
    .map(stall => {
      const ratingDelta = (Math.random() - 0.5) * 0.4;
      const reviewDelta = Math.floor(Math.random() * 3);
      const viewDelta = Math.floor(Math.random() * 20);
      const yAvgRating = Math.max(1, Math.min(5, parseFloat(stall.avgRating) + ratingDelta));
      const yTotalReviews = Math.max(0, stall.totalReviews - reviewDelta);
      const yTotalViews = Math.max(0, stall.totalViews - viewDelta);
      return {
        id: stall.id,
        score: calculateStallScore(yAvgRating, yTotalReviews, yTotalViews),
        avgRating: yAvgRating.toFixed(1),
        totalReviews: yTotalReviews,
        totalViews: yTotalViews,
      };
    })
    .sort((a, b) => b.score - a.score);

  for (let i = 0; i < yesterdayScores.length; i++) {
    const stall = yesterdayScores[i];
    await db.insert(sqliteSchema.rankingSnapshots).values({
      id: generateUUID(),
      stallId: stall.id,
      score: stall.score,
      rank: i + 1,
      avgRating: stall.avgRating,
      totalReviews: stall.totalReviews,
      totalViews: stall.totalViews,
      snapshotDate: yesterdayStr,
      createdAt: nowMs - 86400000,
    });
  }
  console.log(`✅ Inserted ranking snapshots for ${todayStr} and ${yesterdayStr}`);

  console.log('\n✅ Seeding completed!');
  console.log('\nDemo accounts:');
  console.log('  Merchants: merchant1@example.com / password123');
  console.log('  Students:  student1@example.com / password123');
}

if (!isLocalDB) {
  console.error('❌ 请使用 DB_PROVIDER=local 运行此脚本');
  process.exit(1);
}

seedLocal().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
