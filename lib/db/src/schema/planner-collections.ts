import { sql } from "drizzle-orm";
import { jsonb, pgTable, primaryKey, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const plannerCollections = pgTable(
  "planner_collections",
  {
    userId: text("user_id").notNull(),
    collection: varchar("collection", { length: 24 }).notNull(),
    items: jsonb("items").$type<unknown[]>().notNull().default(sql`'[]'::jsonb`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.collection] }),
  }),
);