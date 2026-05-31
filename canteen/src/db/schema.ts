import { pgTable, uuid, varchar, text, decimal, integer, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().$type<'student' | 'merchant'>(),
  name: varchar('name', { length: 100 }).notNull(),
  avatar: varchar('avatar', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Cafeterias table (static data)
export const cafeterias = pgTable('cafeterias', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  location: varchar('location', { length: 200 }).notNull(),
  image: varchar('image', { length: 500 }),
  order: integer('order').default(0).notNull(),
});

// Stalls table
export const stalls = pgTable('stalls', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),
  cafeteriaId: uuid('cafeteria_id').notNull().references(() => cafeterias.id),
  merchantId: uuid('merchant_id').references(() => users.id),
  image: varchar('image', { length: 500 }),
  avgRating: decimal('avg_rating', { precision: 2, scale: 1 }).default('0').notNull(),
  totalReviews: integer('total_reviews').default(0).notNull(),
  totalViews: integer('total_views').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Dishes table
export const dishes = pgTable('dishes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  stallId: uuid('stall_id').notNull().references(() => stalls.id),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  image: varchar('image', { length: 500 }),
  isAvailable: boolean('is_available').default(true).notNull(),
  avgRating: decimal('avg_rating', { precision: 2, scale: 1 }).default('0').notNull(),
  totalReviews: integer('total_reviews').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Reviews table
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  stallId: uuid('stall_id').notNull().references(() => stalls.id),
  dishId: uuid('dish_id').references(() => dishes.id),
  rating: integer('rating').notNull(),
  content: text('content').notNull(),
  images: text('images').array().default([]).notNull(),
  likes: integer('likes').default(0).notNull(),
  merchantReply: text('merchant_reply'),
  repliedAt: timestamp('replied_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Review likes table (many-to-many)
export const reviewLikes = pgTable('review_likes', {
  reviewId: uuid('review_id').notNull().references(() => reviews.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.reviewId, table.studentId] }),
}));

export const favorites = pgTable('favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stallId: uuid('stall_id').notNull().references(() => stalls.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rankingSnapshots = pgTable('ranking_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  stallId: uuid('stall_id').notNull().references(() => stalls.id),
  score: decimal('score', { precision: 10, scale: 2 }).notNull(),
  rank: integer('rank').notNull(),
  avgRating: decimal('avg_rating', { precision: 2, scale: 1 }).notNull(),
  totalReviews: integer('total_reviews').notNull(),
  totalViews: integer('total_views').notNull(),
  snapshotDate: varchar('snapshot_date', { length: 10 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  actorName: varchar('actor_name', { length: 100 }),
  actorAvatar: varchar('actor_avatar', { length: 500 }),
  linkType: varchar('link_type', { length: 50 }),
  linkId: uuid('link_id'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
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
