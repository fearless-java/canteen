import { db } from './index';
import { cafeterias, stalls, dishes, users, reviews } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  // Seed cafeterias
  const cafeteriaData = [
    { name: '东一食堂', description: '东区第一食堂，以川菜和家常菜为主', location: '东区学生宿舍区', order: 1 },
    { name: '东二食堂', description: '东区第二食堂，特色是面食和烧烤', location: '东区教学楼旁', order: 2 },
    { name: '北一食堂', description: '北区第一食堂，以湘菜和快餐为主', location: '北区宿舍区', order: 3 },
    { name: '北二食堂', description: '北区第二食堂，提供各地特色小吃', location: '北区图书馆旁', order: 4 },
  ];

  const insertedCafeterias = await db.insert(cafeterias).values(cafeteriaData).returning();
  console.log(`✅ Inserted ${insertedCafeterias.length} cafeterias`);

  // Seed demo users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const merchants = await db.insert(users).values([
    { email: 'merchant1@example.com', password: hashedPassword, role: 'merchant', name: '张老板' },
    { email: 'merchant2@example.com', password: hashedPassword, role: 'merchant', name: '李老板' },
    { email: 'merchant3@example.com', password: hashedPassword, role: 'merchant', name: '王老板' },
    { email: 'merchant4@example.com', password: hashedPassword, role: 'merchant', name: '刘老板' },
    { email: 'merchant5@example.com', password: hashedPassword, role: 'merchant', name: '陈老板' },
  ]).returning();
  console.log(`✅ Inserted ${merchants.length} merchants`);

  const students = await db.insert(users).values([
    { email: 'student1@example.com', password: hashedPassword, role: 'student', name: '小明' },
    { email: 'student2@example.com', password: hashedPassword, role: 'student', name: '小红' },
    { email: 'student3@example.com', password: hashedPassword, role: 'student', name: '小李' },
    { email: 'student4@example.com', password: hashedPassword, role: 'student', name: '小王' },
    { email: 'student5@example.com', password: hashedPassword, role: 'student', name: '小张' },
  ]).returning();
  console.log(`✅ Inserted ${students.length} students`);

  // Seed stalls for each cafeteria (每个食堂5-6个档口)
  const stallData = [
    // 东一食堂 - 川菜和家常菜
    { name: '川味小炒', description: '正宗四川口味，麻辣鲜香，招牌菜宫保鸡丁', cafeteriaId: insertedCafeterias[0].id, merchantId: merchants[0].id, avgRating: '4.5', totalReviews: 128, image: '/api/uploads/chuan-wei-xiao-chao.jpg' },
    { name: '家常快餐', description: '营养均衡，价格实惠，每日新鲜现做', cafeteriaId: insertedCafeterias[0].id, merchantId: merchants[1].id, avgRating: '4.2', totalReviews: 96, image: '/api/uploads/jia-chang-kuai-can.jpg' },
    { name: '麻辣烫', description: '自选菜品，汤底浓郁，冬季首选', cafeteriaId: insertedCafeterias[0].id, avgRating: '4.3', totalReviews: 156, image: '/api/uploads/ma-la-tang.jpg' },
    { name: '黄焖鸡米饭', description: '鸡肉嫩滑，汤汁浓郁，配米饭绝配', cafeteriaId: insertedCafeterias[0].id, avgRating: '4.4', totalReviews: 112, image: '/api/uploads/huang-men-ji.jpg' },
    { name: '兰州拉面', description: '手工拉面，汤底清亮，牛肉分量足', cafeteriaId: insertedCafeterias[0].id, avgRating: '4.1', totalReviews: 89, image: '/api/uploads/lan-zhou-la-mian.jpg' },
    
    // 东二食堂 - 面食和烧烤
    { name: '重庆小面', description: '地道重庆风味，麻辣鲜香回味无穷', cafeteriaId: insertedCafeterias[1].id, merchantId: merchants[2].id, avgRating: '4.6', totalReviews: 203, image: '/api/uploads/chong-qing-xiao-mian.jpg' },
    { name: '烧烤档', description: '夜宵首选，羊肉串、烤鸡翅、烤茄子', cafeteriaId: insertedCafeterias[1].id, avgRating: '4.3', totalReviews: 178, image: '/api/uploads/shao-kao-dang.jpg' },
    { name: '日式拉面', description: '豚骨汤底浓郁，叉烧肉肥而不腻', cafeteriaId: insertedCafeterias[1].id, avgRating: '4.2', totalReviews: 87, image: '/api/uploads/ri-shi-la-mian.jpg' },
    { name: '煎饼果子', description: '早餐首选，酥脆可口，配料丰富', cafeteriaId: insertedCafeterias[1].id, avgRating: '4.5', totalReviews: 234, image: '/api/uploads/jian-bing-guo-zi.jpg' },
    { name: '炸鸡汉堡', description: '西式快餐，炸鸡酥脆，汉堡分量足', cafeteriaId: insertedCafeterias[1].id, avgRating: '3.9', totalReviews: 145, image: '/api/uploads/zha-ji-han-bao.jpg' },
    
    // 北一食堂 - 湘菜和快餐
    { name: '湘菜馆', description: '湖南特色，辣得过瘾，剁椒鱼头必点', cafeteriaId: insertedCafeterias[2].id, merchantId: merchants[3].id, avgRating: '4.4', totalReviews: 167, image: '/api/uploads/xiang-cai-guan.jpg' },
    { name: '快餐便当', description: '快捷方便，品种丰富，一荤两素', cafeteriaId: insertedCafeterias[2].id, avgRating: '3.8', totalReviews: 134, image: '/api/uploads/kuai-can-bian-dang.jpg' },
    { name: '港式烧腊', description: '烧鸭、叉烧、白切鸡，正宗港味', cafeteriaId: insertedCafeterias[2].id, avgRating: '4.5', totalReviews: 198, image: '/api/uploads/gang-shi-shao-la.jpg' },
    { name: '西北面食', description: '刀削面、油泼面、臊子面，面食天堂', cafeteriaId: insertedCafeterias[2].id, avgRating: '4.3', totalReviews: 156, image: '/api/uploads/xi-bei-mian-shi.jpg' },
    { name: '精品小炒', description: '现炒现卖，锅气十足，口味地道', cafeteriaId: insertedCafeterias[2].id, avgRating: '4.1', totalReviews: 123, image: '/api/uploads/jing-pin-xiao-chao.jpg' },

    // 北二食堂 - 各地特色小吃
    { name: '小吃街', description: '各地特色小吃汇集，一次吃遍全国', cafeteriaId: insertedCafeterias[3].id, merchantId: merchants[4].id, avgRating: '4.3', totalReviews: 289, image: '/api/uploads/xiao-chi-jie.jpg' },
    { name: '甜品站', description: '奶茶甜品，休闲时光，下午茶首选', cafeteriaId: insertedCafeterias[3].id, avgRating: '4.4', totalReviews: 312, image: '/api/uploads/tian-pin-zhan.jpg' },
    { name: '砂锅米线', description: '汤底鲜美，米线Q弹，配料丰富', cafeteriaId: insertedCafeterias[3].id, avgRating: '4.2', totalReviews: 178, image: '/api/uploads/sha-guo-mi-xian.jpg' },
    { name: '铁板烧', description: '现点现做，铁板鱿鱼、牛排、炒饭', cafeteriaId: insertedCafeterias[3].id, avgRating: '4.0', totalReviews: 145, image: '/api/uploads/tie-ban-shao.jpg' },
    { name: '素食坊', description: '健康素食，清淡养生，素菜也美味', cafeteriaId: insertedCafeterias[3].id, avgRating: '4.1', totalReviews: 98, image: '/api/uploads/su-shi-fang.jpg' },
    { name: '海鲜粥铺', description: '生滚粥、海鲜粥、艇仔粥，暖胃首选', cafeteriaId: insertedCafeterias[3].id, avgRating: '4.3', totalReviews: 167, image: '/api/uploads/hai-xian-zhou-pu.jpg' },
  ];

  const insertedStalls = await db.insert(stalls).values(stallData).returning();
  console.log(`✅ Inserted ${insertedStalls.length} stalls`);

  for (const stall of insertedStalls) {
    const randomViews = Math.floor(Math.random() * 450) + 50;
    await db.update(stalls)
      .set({ totalViews: randomViews })
      .where(eq(stalls.id, stall.id));
  }

  // 为每个档口添加菜品 (每个档口6-8个菜品)
  const dishData = [
    // 川味小炒
    { name: '宫保鸡丁', description: '经典川菜，鸡肉嫩滑，花生酥脆', price: '18.00', stallId: insertedStalls[0].id, avgRating: '4.6', totalReviews: 45, image: '/api/uploads/gong-bao-ji-ding.jpg' },
    { name: '麻婆豆腐', description: '麻辣鲜香，下饭神器，四川正宗', price: '12.00', stallId: insertedStalls[0].id, avgRating: '4.4', totalReviews: 38, image: '/api/uploads/ma-po-dou-fu.jpg' },
    { name: '回锅肉', description: '肥而不腻，香味浓郁，川菜经典', price: '22.00', stallId: insertedStalls[0].id, avgRating: '4.5', totalReviews: 42, image: '/api/uploads/hui-guo-rou.jpg' },
    { name: '鱼香肉丝', description: '酸甜可口，肉丝嫩滑，米饭杀手', price: '16.00', stallId: insertedStalls[0].id, avgRating: '4.3', totalReviews: 35, image: '/api/uploads/yu-xiang-rou-si.jpg' },
    { name: '水煮肉片', description: '麻辣过瘾，肉片滑嫩，配菜丰富', price: '24.00', stallId: insertedStalls[0].id, avgRating: '4.4', totalReviews: 40, image: '/api/uploads/shui-zhu-rou-pian.jpg' },
    { name: '辣子鸡', description: '外酥里嫩，麻辣鲜香，下酒好菜', price: '26.00', stallId: insertedStalls[0].id, avgRating: '4.7', totalReviews: 48 },
    { name: '口水鸡', description: '鸡肉嫩滑，麻辣鲜香，开胃凉菜', price: '20.00', stallId: insertedStalls[0].id, avgRating: '4.5', totalReviews: 36 },
    { name: '夫妻肺片', description: '牛肉牛杂，麻辣鲜香，下酒好菜', price: '28.00', stallId: insertedStalls[0].id, avgRating: '4.6', totalReviews: 32 },

    // 家常快餐
    { name: '红烧肉套餐', description: '肥瘦相间，入口即化，配时蔬', price: '20.00', stallId: insertedStalls[1].id, avgRating: '4.3', totalReviews: 28, image: '/api/uploads/hong-shao-rou.jpg' },
    { name: '番茄炒蛋套餐', description: '家常美味，营养健康，酸甜可口', price: '15.00', stallId: insertedStalls[1].id, avgRating: '4.1', totalReviews: 25 },
    { name: '糖醋排骨套餐', description: '酸甜可口，排骨酥烂，老少皆宜', price: '22.00', stallId: insertedStalls[1].id, avgRating: '4.2', totalReviews: 30, image: '/api/uploads/tang-cu-pai-gu.jpg' },
    { name: '清蒸鱼套餐', description: '鱼肉鲜嫩，清淡健康，原汁原味', price: '24.00', stallId: insertedStalls[1].id, avgRating: '4.0', totalReviews: 22, image: '/api/uploads/qing-zheng-yu.jpg' },
    { name: '土豆烧牛肉', description: '牛肉软烂，土豆入味，下饭好菜', price: '23.00', stallId: insertedStalls[1].id, avgRating: '4.3', totalReviews: 26, image: '/api/uploads/tu-dou-shao-niu-rou.jpg' },
    { name: '蒜香鸡翅', description: '鸡翅外酥里嫩，蒜香浓郁', price: '19.00', stallId: insertedStalls[1].id, avgRating: '4.4', totalReviews: 31, image: '/api/uploads/suan-xiang-ji-chi.jpg' },

    // 麻辣烫
    { name: '素菜套餐', description: '豆腐、土豆、白菜、金针菇', price: '12.00', stallId: insertedStalls[2].id, avgRating: '4.2', totalReviews: 42 },
    { name: '荤菜套餐', description: '牛肉、午餐肉、鱼丸、肉丸', price: '18.00', stallId: insertedStalls[2].id, avgRating: '4.4', totalReviews: 38 },
    { name: '全家福套餐', description: '荤素搭配，营养均衡，种类丰富', price: '25.00', stallId: insertedStalls[2].id, avgRating: '4.5', totalReviews: 45 },
    { name: '自选称重', description: '按重量计费，想吃什么拿什么', price: '2.50', stallId: insertedStalls[2].id, avgRating: '4.1', totalReviews: 56 },

    // 黄焖鸡米饭
    { name: '黄焖鸡小份', description: '鸡肉嫩滑，汤汁浓郁，配米饭', price: '16.00', stallId: insertedStalls[3].id, avgRating: '4.4', totalReviews: 52 },
    { name: '黄焖鸡中份', description: '分量十足，配菜丰富，两人份', price: '22.00', stallId: insertedStalls[3].id, avgRating: '4.5', totalReviews: 48 },
    { name: '黄焖鸡大份', description: '超大分量，聚会首选，配菜加倍', price: '32.00', stallId: insertedStalls[3].id, avgRating: '4.6', totalReviews: 35 },
    { name: '黄焖排骨', description: '排骨软烂，酱香浓郁，下饭神器', price: '24.00', stallId: insertedStalls[3].id, avgRating: '4.3', totalReviews: 28 },
    { name: '黄焖猪蹄', description: '猪蹄软糯，胶原蛋白满满', price: '26.00', stallId: insertedStalls[3].id, avgRating: '4.4', totalReviews: 31 },

    // 兰州拉面
    { name: '牛肉拉面', description: '手工拉面，汤底清亮，牛肉薄如纸', price: '12.00', stallId: insertedStalls[4].id, avgRating: '4.2', totalReviews: 38, image: '/api/uploads/niu-rou-la-mian.jpg' },
    { name: '羊肉拉面', description: '羊肉鲜美，汤底浓郁，冬季暖身', price: '15.00', stallId: insertedStalls[4].id, avgRating: '4.1', totalReviews: 32 },
    { name: '炒拉条', description: '面条劲道，配菜丰富，锅气十足', price: '14.00', stallId: insertedStalls[4].id, avgRating: '4.3', totalReviews: 29 },
    { name: '刀削面', description: '面片厚实，口感筋道，汤底鲜美', price: '13.00', stallId: insertedStalls[4].id, avgRating: '4.0', totalReviews: 25 },

    // 重庆小面
    { name: '重庆小面', description: '麻辣鲜香，地道重庆味，面条劲道', price: '10.00', stallId: insertedStalls[5].id, avgRating: '4.5', totalReviews: 67, image: '/api/uploads/chong-qing-xiao-mian.jpg' },
    { name: '豌杂面', description: '豌豆软烂，杂酱香浓，重庆特色', price: '12.00', stallId: insertedStalls[5].id, avgRating: '4.6', totalReviews: 58 },
    { name: '牛肉面', description: '牛肉大块，汤底浓郁，面条劲道', price: '16.00', stallId: insertedStalls[5].id, avgRating: '4.4', totalReviews: 52 },
    { name: '肥肠面', description: '肥肠软糯，处理干净，香辣可口', price: '15.00', stallId: insertedStalls[5].id, avgRating: '4.3', totalReviews: 45 },
    { name: '担担面', description: '花生酱香，微辣可口，干拌风味', price: '11.00', stallId: insertedStalls[5].id, avgRating: '4.2', totalReviews: 38 },
    { name: '酸辣粉', description: '粉条Q弹，酸辣开胃，配菜丰富', price: '12.00', stallId: insertedStalls[5].id, avgRating: '4.4', totalReviews: 49 },

    // 烧烤档
    { name: '羊肉串', description: '肉质鲜嫩，孜然香浓，5串起售', price: '4.00', stallId: insertedStalls[6].id, avgRating: '4.5', totalReviews: 78, image: '/api/uploads/yang-rou-chuan.jpg' },
    { name: '烤鸡翅', description: '外焦里嫩，蜜汁口味，两只起售', price: '8.00', stallId: insertedStalls[6].id, avgRating: '4.4', totalReviews: 65, image: '/api/uploads/kao-ji-chi.jpg' },
    { name: '烤茄子', description: '蒜香浓郁，软糯可口，素食推荐', price: '10.00', stallId: insertedStalls[6].id, avgRating: '4.3', totalReviews: 42, image: '/api/uploads/kao-qie-zi.jpg' },
    { name: '烤玉米', description: '香甜可口，金黄诱人，两根起售', price: '6.00', stallId: insertedStalls[6].id, avgRating: '4.2', totalReviews: 35 },
    { name: '烤韭菜', description: '蒜香浓郁，解腻爽口，素食推荐', price: '8.00', stallId: insertedStalls[6].id, avgRating: '4.1', totalReviews: 28 },
    { name: '烤金针菇', description: '蒜香浓郁，口感爽脆，素食推荐', price: '10.00', stallId: insertedStalls[6].id, avgRating: '4.3', totalReviews: 38 },

    // 日式拉面
    { name: '豚骨拉面', description: '汤底浓郁，叉烧肥而不腻，溏心蛋', price: '22.00', stallId: insertedStalls[7].id, avgRating: '4.2', totalReviews: 32, image: '/api/uploads/tun-gu-la-mian.jpg' },
    { name: '味噌拉面', description: '味噌汤底，口感醇厚，配菜丰富', price: '20.00', stallId: insertedStalls[7].id, avgRating: '4.1', totalReviews: 28 },
    { name: '酱油拉面', description: '酱油汤底，清爽可口，面条劲道', price: '18.00', stallId: insertedStalls[7].id, avgRating: '4.0', totalReviews: 25 },
    { name: '海鲜拉面', description: '虾、蟹棒、鱼丸，海鲜爱好者首选', price: '26.00', stallId: insertedStalls[7].id, avgRating: '4.3', totalReviews: 30 },

    // 煎饼果子
    { name: '经典煎饼果子', description: '薄脆、鸡蛋、葱花、甜面酱', price: '8.00', stallId: insertedStalls[8].id, avgRating: '4.5', totalReviews: 89, image: '/api/uploads/jian-bing-guo-zi.jpg' },
    { name: '双蛋煎饼果子', description: '双份鸡蛋，更加满足', price: '10.00', stallId: insertedStalls[8].id, avgRating: '4.6', totalReviews: 76 },
    { name: '加肠煎饼果子', description: '加入火腿肠，肉香四溢', price: '11.00', stallId: insertedStalls[8].id, avgRating: '4.5', totalReviews: 68 },
    { name: '豪华煎饼果子', description: '双蛋加肠加辣条，全家福', price: '14.00', stallId: insertedStalls[8].id, avgRating: '4.7', totalReviews: 82 },

    // 炸鸡汉堡
    { name: '香辣鸡腿堡', description: '鸡肉酥脆，香辣可口', price: '15.00', stallId: insertedStalls[9].id, avgRating: '3.9', totalReviews: 45, image: '/api/uploads/xiang-la-ji-tui-bao.jpg' },
    { name: '劲脆鸡腿堡', description: '外酥里嫩，口感鲜美', price: '16.00', stallId: insertedStalls[9].id, avgRating: '4.0', totalReviews: 42 },
    { name: '香辣鸡翅', description: '鸡翅酥脆，香辣过瘾', price: '10.00', stallId: insertedStalls[9].id, avgRating: '4.1', totalReviews: 38 },
    { name: '薯条', description: '金黄酥脆，配番茄酱', price: '8.00', stallId: insertedStalls[9].id, avgRating: '3.8', totalReviews: 35 },
    { name: '可乐', description: '冰爽可乐，解腻神器', price: '5.00', stallId: insertedStalls[9].id, avgRating: '4.0', totalReviews: 28 },

    // 湘菜馆
    { name: '剁椒鱼头', description: '鱼头鲜嫩，剁椒香辣，湘菜代表', price: '38.00', stallId: insertedStalls[10].id, avgRating: '4.6', totalReviews: 52, image: '/api/uploads/duo-jiao-yu-tou.jpg' },
    { name: '小炒肉', description: '五花肉香辣，青椒爽口，下饭神器', price: '22.00', stallId: insertedStalls[10].id, avgRating: '4.5', totalReviews: 48 },
    { name: '干锅花菜', description: '花菜爽脆，腊肉香浓，干锅风味', price: '18.00', stallId: insertedStalls[10].id, avgRating: '4.3', totalReviews: 38, image: '/api/uploads/gan-guo-hua-cai.jpg' },
    { name: '酸辣土豆丝', description: '酸辣爽口，土豆丝脆嫩', price: '12.00', stallId: insertedStalls[10].id, avgRating: '4.2', totalReviews: 42 },
    { name: '农家小炒鸡', description: '鸡肉香辣，配菜丰富，农家风味', price: '26.00', stallId: insertedStalls[10].id, avgRating: '4.4', totalReviews: 35, image: '/api/uploads/nong-jia-xiao-chao-ji.jpg' },
    { name: '口味虾', description: '小龙虾香辣，蒜香浓郁，夜宵首选', price: '48.00', stallId: insertedStalls[10].id, avgRating: '4.7', totalReviews: 58, image: '/api/uploads/kou-wei-xia.jpg' },

    // 快餐便当
    { name: '一荤两素套餐', description: '红烧肉配青菜、土豆丝', price: '15.00', stallId: insertedStalls[11].id, avgRating: '3.8', totalReviews: 32 },
    { name: '两荤一素套餐', description: '鸡腿、肉片配青菜', price: '18.00', stallId: insertedStalls[11].id, avgRating: '3.9', totalReviews: 35 },
    { name: '三荤套餐', description: '鸡腿、肉片、鱼丸', price: '22.00', stallId: insertedStalls[11].id, avgRating: '4.0', totalReviews: 28 },
    { name: '素食套餐', description: '青菜、豆腐、土豆丝', price: '12.00', stallId: insertedStalls[11].id, avgRating: '3.7', totalReviews: 25 },

    // 港式烧腊
    { name: '烧鸭饭', description: '鸭肉酥脆，配时蔬和白饭', price: '20.00', stallId: insertedStalls[12].id, avgRating: '4.5', totalReviews: 56, image: '/api/uploads/shao-ya-fan.jpg' },
    { name: '叉烧饭', description: '叉烧甜香，肥瘦相间', price: '22.00', stallId: insertedStalls[12].id, avgRating: '4.6', totalReviews: 48, image: '/api/uploads/cha-shao-fan.jpg' },
    { name: '白切鸡饭', description: '鸡肉嫩滑，蘸姜葱油', price: '18.00', stallId: insertedStalls[12].id, avgRating: '4.3', totalReviews: 42, image: '/api/uploads/bai-qie-ji-fan.jpg' },
    { name: '烧腊双拼', description: '烧鸭拼叉烧，一次吃两种', price: '28.00', stallId: insertedStalls[12].id, avgRating: '4.7', totalReviews: 52 },
    { name: '烧腊三拼', description: '烧鸭、叉烧、白切鸡，全家福', price: '38.00', stallId: insertedStalls[12].id, avgRating: '4.8', totalReviews: 45 },

    // 西北面食
    { name: '油泼面', description: '面条宽厚，热油激发蒜香', price: '13.00', stallId: insertedStalls[13].id, avgRating: '4.4', totalReviews: 38, image: '/api/uploads/you-po-mian.jpg' },
    { name: '臊子面', description: '肉末、土豆、豆腐丁，汤底鲜美', price: '12.00', stallId: insertedStalls[13].id, avgRating: '4.2', totalReviews: 35 },
    { name: '裤带面', description: '面条宽厚如裤带，口感筋道', price: '14.00', stallId: insertedStalls[13].id, avgRating: '4.3', totalReviews: 32 },
    { name: 'biangbiang面', description: '面条宽大，配菜丰富，陕西特色', price: '16.00', stallId: insertedStalls[13].id, avgRating: '4.5', totalReviews: 41, image: '/api/uploads/biangbiang-mian.jpg' },
    { name: '肉夹馍', description: '馍酥肉香，肥瘦相间', price: '10.00', stallId: insertedStalls[13].id, avgRating: '4.4', totalReviews: 48, image: '/api/uploads/rou-jia-mo.jpg' },

    // 精品小炒
    { name: '宫保鸡丁', description: '鸡肉嫩滑，花生酥脆，口味地道', price: '18.00', stallId: insertedStalls[14].id, avgRating: '4.2', totalReviews: 32, image: '/api/uploads/gong-bao-ji-ding.jpg' },
    { name: '青椒肉丝', description: '肉丝嫩滑，青椒爽口', price: '16.00', stallId: insertedStalls[14].id, avgRating: '4.1', totalReviews: 28 },
    { name: '土豆丝', description: '酸辣爽口，土豆丝脆嫩', price: '10.00', stallId: insertedStalls[14].id, avgRating: '4.0', totalReviews: 35 },
    { name: '番茄炒蛋', description: '酸甜可口，家常味道', price: '12.00', stallId: insertedStalls[14].id, avgRating: '4.1', totalReviews: 30 },
    { name: '蒜蓉西兰花', description: '西兰花脆嫩，蒜香浓郁', price: '14.00', stallId: insertedStalls[14].id, avgRating: '4.0', totalReviews: 25 },

    // 小吃街
    { name: '臭豆腐', description: '外酥里嫩，闻着臭吃着香', price: '10.00', stallId: insertedStalls[15].id, avgRating: '4.3', totalReviews: 52, image: '/api/uploads/chou-dou-fu.jpg' },
    { name: '烤冷面', description: '东北特色，酱香浓郁', price: '8.00', stallId: insertedStalls[15].id, avgRating: '4.4', totalReviews: 48 },
    { name: '手抓饼', description: '酥脆可口，配料自选', price: '9.00', stallId: insertedStalls[15].id, avgRating: '4.2', totalReviews: 42 },
    { name: '章鱼小丸子', description: '外酥里嫩，章鱼Q弹', price: '12.00', stallId: insertedStalls[15].id, avgRating: '4.3', totalReviews: 38 },
    { name: '烤肠', description: '肉质Q弹，香脆可口', price: '5.00', stallId: insertedStalls[15].id, avgRating: '4.0', totalReviews: 56 },
    { name: '铁板豆腐', description: '外焦里嫩，酱香浓郁', price: '10.00', stallId: insertedStalls[15].id, avgRating: '4.2', totalReviews: 45 },
    { name: '糖葫芦', description: '酸甜可口，童年回忆', price: '8.00', stallId: insertedStalls[15].id, avgRating: '4.5', totalReviews: 62 },
    { name: '鸡蛋灌饼', description: '鸡蛋灌入饼中，香酥可口', price: '9.00', stallId: insertedStalls[15].id, avgRating: '4.3', totalReviews: 41 },

    // 甜品站
    { name: '珍珠奶茶', description: '奶茶香浓，珍珠Q弹', price: '12.00', stallId: insertedStalls[16].id, avgRating: '4.4', totalReviews: 78, image: '/api/uploads/zhen-zhu-nai-cha.jpg' },
    { name: '芋泥波波奶茶', description: '芋泥绵密，波波Q弹', price: '15.00', stallId: insertedStalls[16].id, avgRating: '4.6', totalReviews: 65 },
    { name: '杨枝甘露', description: '芒果香甜，西米Q弹，港式甜品', price: '16.00', stallId: insertedStalls[16].id, avgRating: '4.5', totalReviews: 58, image: '/api/uploads/yang-zhi-gan-lu.jpg' },
    { name: '双皮奶', description: '奶香浓郁，口感嫩滑', price: '10.00', stallId: insertedStalls[16].id, avgRating: '4.3', totalReviews: 42, image: '/api/uploads/shuang-pi-nai.jpg' },
    { name: '芒果班戟', description: '芒果香甜，奶油绵密', price: '18.00', stallId: insertedStalls[16].id, avgRating: '4.4', totalReviews: 38 },
    { name: '抹茶千层', description: '抹茶清香，层次丰富', price: '22.00', stallId: insertedStalls[16].id, avgRating: '4.5', totalReviews: 45 },
    { name: '草莓蛋糕', description: '草莓新鲜，蛋糕松软', price: '20.00', stallId: insertedStalls[16].id, avgRating: '4.3', totalReviews: 35, image: '/api/uploads/cao-mei-dan-gao.jpg' },
    { name: '红豆冰', description: '红豆绵密，冰爽解腻', price: '12.00', stallId: insertedStalls[16].id, avgRating: '4.2', totalReviews: 32 },

    // 砂锅米线
    { name: '砂锅米线', description: '米线Q弹，汤底鲜美，配菜丰富', price: '14.00', stallId: insertedStalls[17].id, avgRating: '4.3', totalReviews: 48, image: '/api/uploads/sha-guo-mi-xian.jpg' },
    { name: '酸辣米线', description: '酸辣开胃，米线爽滑', price: '15.00', stallId: insertedStalls[17].id, avgRating: '4.4', totalReviews: 42 },
    { name: '番茄米线', description: '番茄汤底浓郁，酸甜可口', price: '16.00', stallId: insertedStalls[17].id, avgRating: '4.2', totalReviews: 35 },
    { name: '肥牛米线', description: '肥牛大片，汤底鲜美', price: '22.00', stallId: insertedStalls[17].id, avgRating: '4.5', totalReviews: 38 },
    { name: '海鲜米线', description: '虾、蛤蜊、鱼丸，海鲜爱好者', price: '26.00', stallId: insertedStalls[17].id, avgRating: '4.4', totalReviews: 32 },

    // 铁板烧
    { name: '铁板鱿鱼', description: '鱿鱼Q弹，酱香浓郁', price: '18.00', stallId: insertedStalls[18].id, avgRating: '4.1', totalReviews: 35, image: '/api/uploads/tie-ban-you-yu.jpg' },
    { name: '铁板牛排', description: '牛排嫩滑，配菜丰富', price: '32.00', stallId: insertedStalls[18].id, avgRating: '4.2', totalReviews: 28 },
    { name: '铁板炒饭', description: '米饭粒粒分明，配料丰富', price: '16.00', stallId: insertedStalls[18].id, avgRating: '4.0', totalReviews: 42, image: '/api/uploads/tie-ban-chao-fan.jpg' },
    { name: '铁板豆腐', description: '豆腐外焦里嫩，酱香浓郁', price: '14.00', stallId: insertedStalls[18].id, avgRating: '4.2', totalReviews: 38 },

    // 素食坊
    { name: '清炒时蔬', description: '时令蔬菜，清淡健康', price: '12.00', stallId: insertedStalls[19].id, avgRating: '4.1', totalReviews: 25, image: '/api/uploads/qing-chao-shi-shu.jpg' },
    { name: '麻婆豆腐', description: '豆腐嫩滑，麻辣可口', price: '14.00', stallId: insertedStalls[19].id, avgRating: '4.2', totalReviews: 28 },
    { name: '素什锦', description: '多种蔬菜，色彩丰富', price: '16.00', stallId: insertedStalls[19].id, avgRating: '4.0', totalReviews: 22 },
    { name: '素炒面', description: '面条劲道，配菜丰富', price: '13.00', stallId: insertedStalls[19].id, avgRating: '4.1', totalReviews: 30 },

    // 海鲜粥铺
    { name: '海鲜粥', description: '虾、蟹棒、鱼丸，粥底绵密', price: '18.00', stallId: insertedStalls[20].id, avgRating: '4.4', totalReviews: 38, image: '/api/uploads/hai-xian-zhou.jpg' },
    { name: '皮蛋瘦肉粥', description: '皮蛋香醇，瘦肉嫩滑', price: '12.00', stallId: insertedStalls[20].id, avgRating: '4.3', totalReviews: 42, image: '/api/uploads/pi-dan-shou-rou-zhou.jpg' },
    { name: '艇仔粥', description: '广州特色，配料丰富', price: '16.00', stallId: insertedStalls[20].id, avgRating: '4.2', totalReviews: 28 },
    { name: '生滚牛肉粥', description: '牛肉嫩滑，粥底绵密', price: '15.00', stallId: insertedStalls[20].id, avgRating: '4.3', totalReviews: 35, image: '/api/uploads/sheng-gun-niu-rou-zhou.jpg' },
    { name: '南瓜粥', description: '南瓜香甜，粥底绵密', price: '8.00', stallId: insertedStalls[20].id, avgRating: '4.1', totalReviews: 32, image: '/api/uploads/nan-gua-zhou.jpg' },
  ];

  const insertedDishes = await db.insert(dishes).values(dishData).returning();
  console.log(`✅ Inserted ${insertedDishes.length} dishes`);

  for (const dish of insertedDishes) {
    await db.update(dishes)
      .set({ totalReviews: 0, avgRating: '0' })
      .where(eq(dishes.id, dish.id));
  }

  // Add some reviews
  const reviewContents = [
    '味道很好，下次还会再来！',
    '价格实惠，分量足，推荐！',
    '口味正宗，老板人很好',
    '排队的人有点多，但值得等待',
    '环境一般，但食物很棒',
    '和同学经常来这里吃',
    '性价比很高，学生党福音',
    '辣度刚好，很下饭',
    '食材新鲜，吃得放心',
    '服务态度很好，上菜快',
  ];

  const reviewData = [];
  for (let i = 0; i < 100; i++) {
    const randomStall = insertedStalls[Math.floor(Math.random() * insertedStalls.length)];
    const randomStudent = students[Math.floor(Math.random() * students.length)];
    const randomRating = Math.floor(Math.random() * 3) + 3; // 3-5 stars
    const randomContent = reviewContents[Math.floor(Math.random() * reviewContents.length)];
    
    reviewData.push({
      studentId: randomStudent.id,
      stallId: randomStall.id,
      rating: randomRating,
      content: randomContent,
      likes: Math.floor(Math.random() * 50),
    });
  }

  await db.insert(reviews).values(reviewData);
  console.log(`✅ Inserted ${reviewData.length} reviews`);

  for (const stall of insertedStalls) {
    const stallReviews = reviewData.filter((r: any) => r.stallId === stall.id);
    if (stallReviews.length > 0) {
      const avgRating = (stallReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / stallReviews.length).toFixed(1);
      await db.update(stalls)
        .set({ totalReviews: stallReviews.length, avgRating })
        .where(eq(stalls.id, stall.id));
    } else {
      await db.update(stalls)
        .set({ totalReviews: 0, avgRating: '0' })
        .where(eq(stalls.id, stall.id));
    }
  }

  console.log('\n✅ Seeding completed!');
  console.log('\nDemo accounts:');
  console.log('  Merchants: merchant1@example.com / password123');
  console.log('  Students:  student1@example.com / password123');
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
