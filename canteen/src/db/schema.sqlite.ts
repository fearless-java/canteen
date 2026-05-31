import { text, integer, real, sqliteTable, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const cafeterias = sqliteTable('cafeterias', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  location: text('location').notNull(),
  image: text('image'),
  order: integer('order').default(0).notNull(),
});

export const stalls = sqliteTable('stalls', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  cafeteriaId: text('cafeteria_id').notNull(),
  merchantId: text('merchant_id'),
  image: text('image'),
  avgRating: text('avg_rating').default('0').notNull(),
  totalReviews: integer('total_reviews').default(0).notNull(),
  totalViews: integer('total_views').default(0).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const dishes = sqliteTable('dishes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  stallId: text('stall_id').notNull(),
  price: text('price').notNull(),
  image: text('image'),
  isAvailable: integer('is_available', { mode: 'boolean' }).default(true).notNull(),
  avgRating: text('avg_rating').default('0').notNull(),
  totalReviews: integer('total_reviews').default(0).notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull(),
  stallId: text('stall_id').notNull(),
  dishId: text('dish_id'),
  rating: integer('rating').notNull(),
  content: text('content').notNull(),
  images: text('images').default('[]').notNull(),
  likes: integer('likes').default(0).notNull(),
  merchantReply: text('merchant_reply'),
  repliedAt: integer('replied_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const reviewLikes = sqliteTable('review_likes', {
  reviewId: text('review_id').notNull(),
  studentId: text('student_id').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [primaryKey({ columns: [table.reviewId, table.studentId] })]);

export const favorites = sqliteTable('favorites', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  stallId: text('stall_id').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const rankingSnapshots = sqliteTable('ranking_snapshots', {
  id: text('id').primaryKey(),
  stallId: text('stall_id').notNull(),
  score: real('score').notNull(),
  rank: integer('rank').notNull(),
  avgRating: text('avg_rating').notNull(),
  totalReviews: integer('total_reviews').notNull(),
  totalViews: integer('total_views').notNull(),
  snapshotDate: text('snapshot_date').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  actorId: text('actor_id'),
  actorName: text('actor_name'),
  actorAvatar: text('actor_avatar'),
  linkType: text('link_type'),
  linkId: text('link_id'),
  isRead: integer('is_read', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at').notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  stalls: many(stalls),
  reviews: many(reviews),
  reviewLikes: many(reviewLikes),
  favorites: many(favorites),
  messages: many(messages),
}));

export const cafeteriasRelations = relations(cafeterias, ({ many }) => ({
  stalls: many(stalls),
}));

export const stallsRelations = relations(stalls, ({ one, many }) => ({
  cafeteria: one(cafeterias, {
    fields: [stalls.cafeteriaId],
    references: [cafeterias.id],
  }),
  merchant: one(users, {
    fields: [stalls.merchantId],
    references: [users.id],
  }),
  dishes: many(dishes),
  reviews: many(reviews),
}));

export const dishesRelations = relations(dishes, ({ one, many }) => ({
  stall: one(stalls, {
    fields: [dishes.stallId],
    references: [stalls.id],
  }),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  student: one(users, {
    fields: [reviews.studentId],
    references: [users.id],
  }),
  stall: one(stalls, {
    fields: [reviews.stallId],
    references: [stalls.id],
  }),
  dish: one(dishes, {
    fields: [reviews.dishId],
    references: [dishes.id],
  }),
  likes: many(reviewLikes),
}));

export const reviewLikesRelations = relations(reviewLikes, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewLikes.reviewId],
    references: [reviews.id],
  }),
  student: one(users, {
    fields: [reviewLikes.studentId],
    references: [users.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  stall: one(stalls, {
    fields: [favorites.stallId],
    references: [stalls.id],
  }),
}));

export const rankingSnapshotsRelations = relations(rankingSnapshots, ({ one }) => ({
  stall: one(stalls, {
    fields: [rankingSnapshots.stallId],
    references: [stalls.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Cafeteria = typeof cafeterias.$inferSelect;
export type Stall = typeof stalls.$inferSelect;
export type Dish = typeof dishes.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type ReviewLike = typeof reviewLikes.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type RankingSnapshot = typeof rankingSnapshots.$inferSelect;
