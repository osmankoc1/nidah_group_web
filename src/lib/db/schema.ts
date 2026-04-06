import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────────────────

export const rfqStatusEnum = pgEnum("rfq_status", [
  "pending",
  "contacted",
  "quoted",
  "closed",
]);

export const rfqPriorityEnum = pgEnum("rfq_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

// ── RFQ Submissions ────────────────────────────────────────────────────────

export const rfqSubmissions = pgTable(
  "rfq_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    company: varchar("company", { length: 255 }),
    phone: varchar("phone", { length: 50 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    brand: varchar("brand", { length: 100 }),
    machineModel: varchar("machine_model", { length: 255 }),
    partNumber: varchar("part_number", { length: 100 }),
    quantity: integer("quantity").default(1),
    country: varchar("country", { length: 100 }).default("Türkiye"),
    message: text("message"),
    status: rfqStatusEnum("status").default("pending").notNull(),
    priority: rfqPriorityEnum("priority").default("normal").notNull(),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_rfq_status").on(table.status),
    index("idx_rfq_created_at").on(table.createdAt),
    index("idx_rfq_email").on(table.email),
    index("idx_rfq_brand").on(table.brand),
  ]
);

export type RfqSubmission = typeof rfqSubmissions.$inferSelect;
export type NewRfqSubmission = typeof rfqSubmissions.$inferInsert;

// ── Catalog Enums ────────────────────────────────────────────────────────────

export const productConditionEnum = pgEnum("product_condition", [
  "new",
  "used",
  "remanufactured",
]);

// ── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    parentId: uuid("parent_id"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_categories_slug").on(table.slug)]
);

// ── Manufacturers ────────────────────────────────────────────────────────────

export const manufacturers = pgTable(
  "manufacturers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    logoUrl: text("logo_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_manufacturers_slug").on(table.slug)]
);

// ── Machines ─────────────────────────────────────────────────────────────────

export const machines = pgTable(
  "machines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id, { onDelete: "restrict" }),
    model: varchar("model", { length: 255 }).notNull(),
    type: varchar("type", { length: 100 }), // excavator, grader, roller, etc.
    yearFrom: integer("year_from"),
    yearTo: integer("year_to"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_machines_manufacturer").on(table.manufacturerId)]
);

// ── Machine Variants ──────────────────────────────────────────────────────────

export const machineVariants = pgTable(
  "machine_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    machineId: uuid("machine_id")
      .notNull()
      .references(() => machines.id, { onDelete: "cascade" }),
    variantName: varchar("variant_name", { length: 255 }).notNull(),
    engineModel: varchar("engine_model", { length: 100 }),
    serialFrom: varchar("serial_from", { length: 50 }),
    serialTo: varchar("serial_to", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_machine_variants_machine").on(table.machineId)]
);

// ── Products ─────────────────────────────────────────────────────────────────

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partNumber: varchar("part_number", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 500 }).notNull(),
    description: text("description"),
    condition: productConditionEnum("condition").default("new").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    weight: real("weight"), // kg
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    inStock:  boolean("in_stock").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_products_part_number").on(table.partNumber),
    index("idx_products_is_active").on(table.isActive),
    index("idx_products_category").on(table.categoryId),
  ]
);

// ── Product Images ────────────────────────────────────────────────────────────

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    cloudinaryId: varchar("cloudinary_id", { length: 500 }).notNull(),
    cloudinaryUrl: text("cloudinary_url").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_product_images_product").on(table.productId)]
);

// ── Fitments (many-to-many: product ↔ machine[variant]) ──────────────────────
// Partial unique: (productId, machineId) when variant is null,
//                 (productId, machineId, machineVariantId) when variant is set.
// Enforced via two partial unique indexes.

export const fitments = pgTable(
  "fitments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    machineId: uuid("machine_id")
      .notNull()
      .references(() => machines.id, { onDelete: "cascade" }),
    machineVariantId: uuid("machine_variant_id").references(
      () => machineVariants.id,
      { onDelete: "cascade" }
    ),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_fitments_product").on(table.productId),
    index("idx_fitments_machine").on(table.machineId),
    // Partial unique: no variant
    uniqueIndex("uq_fitment_no_variant")
      .on(table.productId, table.machineId)
      .where(sql`${table.machineVariantId} IS NULL`),
    // Partial unique: with variant
    uniqueIndex("uq_fitment_with_variant")
      .on(table.productId, table.machineId, table.machineVariantId)
      .where(sql`${table.machineVariantId} IS NOT NULL`),
  ]
);

// ── OEM / Cross-Reference Numbers ────────────────────────────────────────────

export const oemNumbers = pgTable(
  "oem_numbers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    oemNumber: varchar("oem_number", { length: 200 }).notNull(),
    manufacturer: varchar("manufacturer", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_oem_numbers_product").on(table.productId),
    index("idx_oem_numbers_number").on(table.oemNumber),
  ]
);

// ── Blog ──────────────────────────────────────────────────────────────────────

export const blogStatusEnum = pgEnum("blog_status", [
  "draft",
  "published",
  "archived",
]);

export const blogCategories = pgTable(
  "blog_categories",
  {
    id:          uuid("id").defaultRandom().primaryKey(),
    name:        varchar("name", { length: 255 }).notNull(),
    slug:        varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_blog_categories_slug").on(table.slug)]
);

export const blogTags = pgTable(
  "blog_tags",
  {
    id:        uuid("id").defaultRandom().primaryKey(),
    name:      varchar("name", { length: 100 }).notNull(),
    slug:      varchar("slug", { length: 100 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_blog_tags_slug").on(table.slug)]
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id:               uuid("id").defaultRandom().primaryKey(),
    title:            varchar("title", { length: 500 }).notNull(),
    slug:             varchar("slug", { length: 500 }).notNull().unique(),
    content:          text("content").notNull().default(""),
    excerpt:          text("excerpt"),
    coverImageUrl:    text("cover_image_url"),
    coverCloudinaryId: varchar("cover_cloudinary_id", { length: 500 }),
    metaTitle:        varchar("meta_title", { length: 255 }),
    metaDescription:  text("meta_description"),
    status:           blogStatusEnum("status").default("draft").notNull(),
    publishedAt:      timestamp("published_at", { withTimezone: true }),
    authorName:       varchar("author_name", { length: 255 }).default("NİDAH GROUP").notNull(),
    categoryId:       uuid("category_id").references(() => blogCategories.id, { onDelete: "set null" }),
    readingTimeMinutes: integer("reading_time_minutes").default(3).notNull(),
    createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_blog_posts_slug").on(table.slug),
    index("idx_blog_posts_status").on(table.status),
    index("idx_blog_posts_published_at").on(table.publishedAt),
    index("idx_blog_posts_category").on(table.categoryId),
  ]
);

export const blogPostTags = pgTable(
  "blog_post_tags",
  {
    postId: uuid("post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
    tagId:  uuid("tag_id").notNull().references(() => blogTags.id,  { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("uq_blog_post_tag").on(table.postId, table.tagId),
    index("idx_blog_post_tags_post").on(table.postId),
    index("idx_blog_post_tags_tag").on(table.tagId),
  ]
);

export type BlogCategory   = typeof blogCategories.$inferSelect;
export type BlogTag        = typeof blogTags.$inferSelect;
export type BlogPost       = typeof blogPosts.$inferSelect;
export type NewBlogPost    = typeof blogPosts.$inferInsert;

// ── Types ─────────────────────────────────────────────────────────────────────

export type Category = typeof categories.$inferSelect;
export type Manufacturer = typeof manufacturers.$inferSelect;
export type Machine = typeof machines.$inferSelect;
export type MachineVariant = typeof machineVariants.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type Fitment = typeof fitments.$inferSelect;
export type OemNumber = typeof oemNumbers.$inferSelect;
