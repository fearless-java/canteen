#!/usr/bin/env tsx

import { db, isLocalDB } from './index';
import * as sqliteSchema from './schema.sqlite';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

function generateUUID() {
  return crypto.randomUUID();
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
  
  const merchantData = [
    { id: generateUUID(), email: 'merchant1@example.com', password: hashedPassword, role: 'merchant' as const, name: '张老板', createdAt: now, updatedAt: now },
    { id: generateUUID(), email: 'merchant2@example.com', password: hashedPassword, role: 'merchant' as const, name: '李老板', createdAt: now, updatedAt: now },
    { id: generateUUID(), email: 'merchant3@example.com', password: hashedPassword, role: 'merchant' as const, name: '王老板', createdAt: now, updatedAt: now },
    { id: generateUUID(), email: 'merchant4@example.com', password: hashedPassword, role: 'merchant' as const, name: '刘老板', createdAt: now, updatedAt: now },
    { id: generateUUID(), email: 'merchant5@example.com', password: hashedPassword, role: 'merchant' as const, name: '陈老板', createdAt: now, updatedAt: now },
  ];

  for (const item of merchantData) {
    await db.insert(sqliteSchema.users).values(item);
  }
  console.log(`✅ Inserted ${merchantData.length} merchants`);

  const studentData = [
    { id: generateUUID(), email: 'student1@example.com', password: hashedPassword, role: 'student' as const, name: '小明', createdAt: now, updatedAt: now },
    { id: generateUUID(), email: 'student2@example.com', password: hashedPassword, role: 'student' as const, name: '小红', createdAt: now, updatedAt: now },
    { id: generateUUID(), email: 'student3@example.com', password: hashedPassword, role: 'student' as const, name: '小李', createdAt: now, updatedAt: now },
    { id: generateUUID(), email: 'student4@example.com', password: hashedPassword, role: 'student' as const, name: '小王', createdAt: now, updatedAt: now },
    { id: generateUUID(), email: 'student5@example.com', password: hashedPassword, role: 'student' as const, name: '小张', createdAt: now, updatedAt: now },
  ];

  for (const item of studentData) {
    await db.insert(sqliteSchema.users).values(item);
  }
  console.log(`✅ Inserted ${studentData.length} students`);

  const merchants = await db.select().from(sqliteSchema.users).where(eq(sqliteSchema.users.role, 'merchant'));
  const students = await db.select().from(sqliteSchema.users).where(eq(sqliteSchema.users.role, 'student'));

  const stallData = [
    { id: generateUUID(), name: '川味小炒', description: '正宗四川口味，麻辣鲜香', cafeteriaId: insertedCafeterias[0].id, merchantId: merchants[0]?.id, avgRating: '4.5', totalReviews: 128, totalViews: 500, isActive: true, image: '/api/uploads/chuan-wei-xiao-chao.jpg', createdAt: now, updatedAt: now },
    { id: generateUUID(), name: '家常快餐', description: '营养均衡，价格实惠', cafeteriaId: insertedCafeterias[0].id, merchantId: merchants[1]?.id, avgRating: '4.2', totalReviews: 96, totalViews: 400, isActive: true, image: '/api/uploads/jia-chang-kuai-can.jpg', createdAt: now, updatedAt: now },
    { id: generateUUID(), name: '麻辣烫', description: '自选菜品，汤底浓郁', cafeteriaId: insertedCafeterias[0].id, avgRating: '4.3', totalReviews: 156, totalViews: 600, isActive: true, image: '/api/uploads/ma-la-tang.jpg', createdAt: now, updatedAt: now },
    { id: generateUUID(), name: '重庆小面', description: '地道重庆风味', cafeteriaId: insertedCafeterias[1].id, merchantId: merchants[2]?.id, avgRating: '4.6', totalReviews: 203, totalViews: 700, isActive: true, image: '/api/uploads/chong-qing-xiao-mian.jpg', createdAt: now, updatedAt: now },
    { id: generateUUID(), name: '烧烤档', description: '夜宵首选', cafeteriaId: insertedCafeterias[1].id, avgRating: '4.3', totalReviews: 178, totalViews: 550, isActive: true, image: '/api/uploads/shao-kao-dang.jpg', createdAt: now, updatedAt: now },
    { id: generateUUID(), name: '湘菜馆', description: '湖南特色，辣得过瘾', cafeteriaId: insertedCafeterias[2].id, merchantId: merchants[3]?.id, avgRating: '4.4', totalReviews: 167, totalViews: 480, isActive: true, image: '/api/uploads/xiang-cai-guan.jpg', createdAt: now, updatedAt: now },
    { id: generateUUID(), name: '小吃街', description: '各地特色小吃汇集', cafeteriaId: insertedCafeterias[3].id, merchantId: merchants[4]?.id, avgRating: '4.3', totalReviews: 289, totalViews: 800, isActive: true, image: '/api/uploads/xiao-chi-jie.jpg', createdAt: now, updatedAt: now },
  ];

  for (const item of stallData) {
    await db.insert(sqliteSchema.stalls).values(item);
  }
  console.log(`✅ Inserted ${stallData.length} stalls`);

  const insertedStalls = await db.select().from(sqliteSchema.stalls);

  const dishData = [
    { id: generateUUID(), name: '宫保鸡丁', description: '经典川菜', price: '18.00', stallId: insertedStalls[0].id, avgRating: '4.6', totalReviews: 45, isAvailable: true, image: '/api/uploads/gong-bao-ji-ding.jpg', createdAt: now, updatedAt: now },
    { id: generateUUID(), name: '麻婆豆腐', description: '麻辣鲜香', price: '12.00', stallId: insertedStalls[0].id, avgRating: '4.4', totalReviews: 38, isAvailable: true, image: '/api/uploads/ma-po-dou-fu.jpg', createdAt: now, updatedAt: now },
    { id: generateUUID(), name: '重庆小面', description: '麻辣鲜香', price: '10.00', stallId: insertedStalls[3].id, avgRating: '4.5', totalReviews: 67, isAvailable: true, image: '/api/uploads/chong-qing-xiao-mian.jpg', createdAt: now, updatedAt: now },
    { id: generateUUID(), name: '羊肉串', description: '肉质鲜嫩', price: '4.00', stallId: insertedStalls[4].id, avgRating: '4.5', totalReviews: 78, isAvailable: true, image: '/api/uploads/yang-rou-chuan.jpg', createdAt: now, updatedAt: now },
    { id: generateUUID(), name: '剁椒鱼头', description: '湘菜代表', price: '38.00', stallId: insertedStalls[5].id, avgRating: '4.6', totalReviews: 52, isAvailable: true, image: '/api/uploads/duo-jiao-yu-tou.jpg', createdAt: now, updatedAt: now },
    { id: generateUUID(), name: '臭豆腐', description: '闻着臭吃着香', price: '10.00', stallId: insertedStalls[6].id, avgRating: '4.3', totalReviews: 52, isAvailable: true, image: '/api/uploads/chou-dou-fu.jpg', createdAt: now, updatedAt: now },
  ];

  for (const item of dishData) {
    await db.insert(sqliteSchema.dishes).values(item);
  }
  console.log(`✅ Inserted ${dishData.length} dishes`);

  const reviewContents = [
    '味道很好，下次还会再来！',
    '价格实惠，分量足，推荐！',
    '口味正宗，老板人很好',
    '排队的人有点多，但值得等待',
  ];

  for (let i = 0; i < 20; i++) {
    const randomStall = insertedStalls[Math.floor(Math.random() * insertedStalls.length)];
    const randomStudent = students[Math.floor(Math.random() * students.length)];
    const randomRating = Math.floor(Math.random() * 3) + 3;
    const randomContent = reviewContents[Math.floor(Math.random() * reviewContents.length)];
    
    await db.insert(sqliteSchema.reviews).values({
      id: generateUUID(),
      studentId: randomStudent.id,
      stallId: randomStall.id,
      rating: randomRating,
      content: randomContent,
      images: '[]',
      likes: Math.floor(Math.random() * 50),
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`✅ Inserted 20 reviews`);

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
