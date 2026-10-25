import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const scenes = sqliteTable('scenes',{id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),data:text('data').notNull(),revision:integer('revision').notNull().default(1),updated:text('updated').notNull()});
