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
  jsonb,
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

/**
 * products.stock_status — Faz 2 (drizzle/0008_product_catalog_phase2.sql).
 *
 * `in_stock BOOLEAN DEFAULT TRUE` kolonu "teyit edildi" ile "kimse dokunmadı"
 * durumlarını ayırt edemiyordu. Bu enum ayırt eder ve varsayılan 'unknown'dur:
 * hiçbir ürün, bir insan açıkça işaretlemedikçe "stokta" olarak sunulamaz.
 * `in_stock` geriye uyumluluk için KORUNUR; otorite bu kolondur.
 */
export const productStockStatusEnum = pgEnum("product_stock_status", [
  "unknown",
  "in_stock",
  "on_order",
]);

/**
 * products.sourcing_type — parçanın temin niteliği.
 * 'unknown' varsayılanı, teyit edilmemiş OEM iddiasını engeller.
 */
export const productSourcingTypeEnum = pgEnum("product_sourcing_type", [
  "unknown",
  "oem",
  "oem_equivalent",
  "aftermarket",
]);

/**
 * oem_numbers.type — bir numaranın ürünle ilişkisinin cinsi.
 * `supersedes` / `superseded_by` ayrı iki değer olduğu için Prosis'in
 * replaces / replaced_by yön bilgisi ek bir ilişki tablosu olmadan korunur.
 * (drizzle/0007_part_number_types.sql)
 */
export const partNumberTypeEnum = pgEnum("part_number_type", [
  "oem",
  "cross_ref",
  "alternate",
  "supersedes",
  "superseded_by",
  "prefixless",
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
    /** İnsan tarafından okunan kanonik değer — "CH 76281". */
    partNumber: varchar("part_number", { length: 100 }).notNull().unique(),
    /**
     * Eşleştirme/benzersizlik anahtarı — "CH76281".
     * `normalizePartNumber()` üretir; `uq_products_pn_norm` benzersiz tutar.
     * NULLABLE: migration kod deploy'undan önce çalıştığı için o penceredeki
     * eski INSERT'ler kırılmasın. (drizzle/0006_part_number_identity.sql)
     */
    partNumberNormalized: varchar("part_number_normalized", { length: 100 }),

    /**
     * Faz 3 (drizzle/0010): Logo İşbaşı'ndaki ORİJİNAL stok kodu, HAM hâliyle
     * ("002 236 11 10" aynen böyle; baştaki sıfırlar ve ayırıcılar korunur).
     *
     * `partNumber` K1 kararıyla doğrulanmış KATALOG numarasını tuttuğu için
     * orijinal stok kodunun saklanacağı başka bir alan yoktu.
     *
     * BU BİR NUMARA İDDİASI DEĞİLDİR: iç kullanım içindir, public yüzeyde
     * gösterilmez, JSON-LD'ye yazılmaz, `oem_numbers`'a kopyalanmaz.
     * Bağımsız kaynak doğrulaması olmadan OEM / muadil olarak etiketlenmez.
     */
    internalStockCode: varchar("internal_stock_code", { length: 100 }),
    /**
     * `internalStockCode`'un eşleştirme anahtarı — `normalizePartNumber()`.
     * BENZERSİZ DEĞİL: Logo verisinde normalize edildiğinde çakışan gerçek
     * mükerrer kodlar var (örn. "002 236 11 10" ↔ "0022361110"). Benzersiz
     * kısıt bunları içe aktarma hatasına çevirirdi; mükerrerler sorguyla
     * raporlanıp ELLE çözülür, otomatik birleştirilmez. (drizzle/0010)
     */
    internalStockCodeNormalized: varchar("internal_stock_code_normalized", {
      length: 100,
    }),

    name: varchar("name", { length: 500 }).notNull(),
    description: text("description"),
    condition: productConditionEnum("condition").default("new").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    weight: real("weight"), // kg
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    /**
     * LEGACY stok bayrağı. DEFAULT TRUE olduğu için "teyit edildi" anlamına
     * GELMEZ; bu yüzden stok iddiası için kullanılmaz. Geriye uyumluluk için
     * korunur — otorite `stockStatus`'tur. (drizzle/0008)
     */
    inStock:  boolean("in_stock").default(true).notNull(),

    // ── Faz 2 (drizzle/0008_product_catalog_phase2.sql) ──────────────────────

    /**
     * PARÇANIN KENDİ üreticisi. NULL = bilinmiyor.
     * Uyumlu makinenin üreticisinden TAMAMEN BAĞIMSIZDIR ve `fitments`
     * zincirinden ASLA türetilmez — o hata denetimde C9 olarak kayıtlıdır.
     */
    partManufacturer: varchar("part_manufacturer", { length: 255 }),
    /** Temin niteliği; 'unknown' iken OEM/muadil iddiası yapılmaz. */
    sourcingType: productSourcingTypeEnum("sourcing_type")
      .default("unknown")
      .notNull(),
    /** Stok otoritesi. 'unknown' = teyit edilmedi, iddia edilmez. */
    stockStatus: productStockStatusEnum("stock_status")
      .default("unknown")
      .notNull(),
    /** Stok durumunu bir insanın son güncellediği an. */
    stockStatusUpdatedAt: timestamp("stock_status_updated_at", { withTimezone: true }),

    /** Kartlarda ve meta açıklamada kullanılan kısa, benzersiz metin. */
    shortDescription: varchar("short_description", { length: 500 }),
    /** Sayfa gövdesindeki uzun, benzersiz TR metin (ince içerik önlemi). */
    longDescription: text("long_description"),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),

    /**
     * YAYIN KAPISI. false iken ürün sitemap'e girmez ve indekslenmez.
     * Varsayılan false — hiçbir ürün otomatik yayına girmez (denetim C11).
     */
    seoReady: boolean("seo_ready").default(false).notNull(),
    /** Yayın onayının verildiği an. */
    seoReadyAt: timestamp("seo_ready_at", { withTimezone: true }),

    /**
     * SENTETİK (test) kaydı mı — `drizzle/0012`, karar K8.
     *
     * Dev'de 2026-11-17'de uygulandı; 12 kayıt KİMLİK LİSTESİYLE işaretlendi
     * (desen tahminiyle DEĞİL). PRODUCTION'DA HENÜZ YOK — bu kolonu okuyan
     * kod deploy edilmeden önce 0012 uygulanmak zorunda.
     *
     * YALNIZCA YÖNETİM PANELİ. Public okuma yolları bu kolonu SEÇMEZ;
     * `tests/schema-phase4.spec.ts` bunu kilitler.
     *
     * `is_active = false` korumasının YERİNE GEÇMEZ — ek bir katmandır.
     */
    isSynthetic: boolean("is_synthetic").default(false).notNull(),

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
    uniqueIndex("uq_products_pn_norm").on(table.partNumberNormalized),
    // Yayına hazır ürünleri tam tarama yapmadan çekmek için kısmi index
    // (generateStaticParams + katalog sitemap'i). drizzle/0008
    index("idx_products_seo_ready").on(table.partNumber).where(sql`${table.seoReady}`),
    index("idx_products_stock_status").on(table.stockStatus),
    // Faz 2 (drizzle/0012): sentetik kayıtları varsayılan listeden gizlemek
    // için kısmi index — işaretli satır sayısı az.
    index("idx_products_synthetic").on(table.id).where(sql`${table.isSynthetic}`),
    // Faz 3 (drizzle/0010): orijinal Logo stok koduyla arama. Kısmi index —
    // yalnızca kodu olan kayıtlar. BENZERSİZ DEĞİL (gerekçe kolon yorumunda).
    index("idx_products_internal_stock_code")
      .on(table.internalStockCode)
      .where(sql`${table.internalStockCode} IS NOT NULL`),
    index("idx_products_internal_stock_code_norm")
      .on(table.internalStockCodeNormalized)
      .where(sql`${table.internalStockCodeNormalized} IS NOT NULL`),
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

    // ── drizzle/0011: görsel doğrulama, ALT metni, kaynak izi ──────────────
    // Dev'de 2026-11-17'de uygulandı. PRODUCTION'DA HENÜZ YOK — bu kolonları
    // okuyan kod production'a deploy edilmeden ÖNCE 0011 uygulanmak zorunda
    // (proje CLAUDE.md §5: migration ÖNCE, kod SONRA).
    //
    // Bu dosya GERÇEKTEN bu parçayı gösteriyor mu? Varsayılan HAYIR —
    // `fitments.verified` / `oem_numbers.verified` ile aynı ilke.
    // YALNIZCA `verified = true` görseller public yüzeye, JSON-LD'ye ve
    // image sitemap'e girer.
    verified: boolean("verified").default(false).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    /** Doğrulamayı yapan admin kullanıcı adı. Parola/token/e-posta DEĞİL. */
    verifiedBy: varchar("verified_by", { length: 200 }),
    /** Görseli TARİF EDEN metin. verified=true için zorunlu (DB CHECK). */
    altText: varchar("alt_text", { length: 300 }),
    /** Fotoğrafın dayanağı. verified=true için zorunlu (DB CHECK). */
    sourceNote: varchar("source_note", { length: 255 }),
  },
  (table) => [
    index("idx_product_images_product").on(table.productId),
    // Kısmi index — "bu ürünün doğrulanmış görseli var mı?" sorusu için.
    index("idx_product_images_verified")
      .on(table.productId)
      .where(sql`${table.verified}`),
  ]
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
    /**
     * Faz 2 (drizzle/0008): uyumluluk bir insan tarafından DOĞRULANDI mı?
     * false iken sayfada kesin bilgi olarak sunulmaz ve yapısal veriye yazılmaz.
     */
    verified: boolean("verified").default(false).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    /** Doğrulamanın dayanağı (üretici katalogu, tedarikçi listesi, ölçüm…). */
    source: varchar("source", { length: 255 }),
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
    /** İnsan tarafından okunan numara — "11184523". */
    oemNumber: varchar("oem_number", { length: 200 }).notNull(),
    /**
     * Eşleştirme anahtarı — `normalizePartNumber()` üretir.
     * NOT NULL: bu tabloya yazan hiçbir kod yolu henüz yok ve tablo boş, bu
     * yüzden 0006'daki NULLABLE gerekçesi burada geçerli DEĞİL. Normalize
     * yazmayı unutan bir INSERT sessizce bozuk satır üretmek yerine hata verir.
     */
    numberNormalized: varchar("number_normalized", { length: 200 }).notNull(),
    /** Numaranın ürünle ilişkisinin cinsi. */
    type: partNumberTypeEnum("type").default("oem").notNull(),
    manufacturer: varchar("manufacturer", { length: 100 }),
    /** Serbest not — Prosis cross_refs[].note / supersession[].note karşılığı. */
    note: text("note"),
    /**
     * Faz 2 (drizzle/0008): numara bir insan tarafından DOĞRULANDI mı?
     * false iken OEM / muadil olarak KESİN bilgi gibi yayınlanmaz.
     */
    verified: boolean("verified").default(false).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    /** Numaranın alındığı kaynak. */
    source: varchar("source", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_oem_numbers_product").on(table.productId),
    index("idx_oem_numbers_number").on(table.oemNumber),
    index("idx_oem_number_normalized").on(table.numberNormalized),
    uniqueIndex("uq_oem_product_number_type").on(
      table.productId,
      table.numberNormalized,
      table.type
    ),
  ]
);

// ── Product Translations (Faz 2 — drizzle/0008) ──────────────────────────────
//
// TASARIM: SLUG KOLONU YOK. Ürün URL'i parça numarasından üretilir
// (`toPartNumberUrlSegment`) ve parça numaraları ÇEVRİLMEZ; dolayısıyla URL
// dilden bağımsızdır. `blogPostTranslations` slug taşır çünkü başlık çevrilir.
//
// `published` DİL BAŞINA kapıdır: bir çeviri satırının var olması onu yayına
// sokmaz. Doğrulanmamış çeviri OTOMATİK YAYINLANMAZ — blogdaki manuel
// TR/EN/RU/AR davranışı korunur.

export const productTranslations = pgTable(
  "product_translations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** 'en' | 'ru' | 'ar' … TR temel satırdır (`products` tablosu). */
    locale: varchar("locale", { length: 10 }).notNull(),
    name: varchar("name", { length: 500 }).notNull(),
    shortDescription: varchar("short_description", { length: 500 }),
    longDescription: text("long_description"),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),
    /** Dil başına yayın kapısı. Varsayılan false. */
    published: boolean("published").default(false).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_product_translation_product_locale").on(table.productId, table.locale),
    index("idx_product_translations_product").on(table.productId),
    index("idx_product_translations_locale").on(table.locale),
    index("idx_product_translations_published")
      .on(table.locale)
      .where(sql`${table.published}`),
  ]
);

export type ProductTranslation = typeof productTranslations.$inferSelect;
export type NewProductTranslation = typeof productTranslations.$inferInsert;

// ── Blog ──────────────────────────────────────────────────────────────────────

export const blogStatusEnum = pgEnum("blog_status", [
  "draft",
  "published",
  "archived",
  "hidden",
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
    keywords:         text("keywords"),
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

export const blogPostTranslations = pgTable(
  "blog_post_translations",
  {
    id:             uuid("id").defaultRandom().primaryKey(),
    postId:         uuid("post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
    locale:         varchar("locale", { length: 10 }).notNull(), // 'tr' | 'en'
    title:          varchar("title", { length: 500 }).notNull(),
    slug:           varchar("slug", { length: 500 }).notNull(),
    content:        text("content").notNull().default(""),
    excerpt:        text("excerpt"),
    seoTitle:       varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    keywords:       text("keywords"),
    createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_blog_translation_post_locale").on(table.postId, table.locale),
    uniqueIndex("uq_blog_translation_locale_slug").on(table.locale, table.slug),
    index("idx_blog_translations_post").on(table.postId),
    index("idx_blog_translations_locale").on(table.locale),
    index("idx_blog_translations_slug").on(table.slug),
  ]
);

export const blogCategoryTranslations = pgTable(
  "blog_category_translations",
  {
    id:          uuid("id").defaultRandom().primaryKey(),
    categoryId:  uuid("category_id").notNull().references(() => blogCategories.id, { onDelete: "cascade" }),
    locale:      varchar("locale", { length: 10 }).notNull(),
    name:        varchar("name", { length: 255 }).notNull(),
    slug:        varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_blog_cat_trans_category_locale").on(table.categoryId, table.locale),
    uniqueIndex("uq_blog_cat_trans_locale_slug").on(table.locale, table.slug),
    index("idx_blog_cat_trans_category").on(table.categoryId),
    index("idx_blog_cat_trans_slug").on(table.slug),
  ]
);

export const blogTagTranslations = pgTable(
  "blog_tag_translations",
  {
    id:        uuid("id").defaultRandom().primaryKey(),
    tagId:     uuid("tag_id").notNull().references(() => blogTags.id, { onDelete: "cascade" }),
    locale:    varchar("locale", { length: 10 }).notNull(),
    name:      varchar("name", { length: 100 }).notNull(),
    slug:      varchar("slug", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_blog_tag_trans_tag_locale").on(table.tagId, table.locale),
    uniqueIndex("uq_blog_tag_trans_locale_slug").on(table.locale, table.slug),
    index("idx_blog_tag_trans_tag").on(table.tagId),
    index("idx_blog_tag_trans_slug").on(table.slug),
  ]
);

export type BlogCategory              = typeof blogCategories.$inferSelect;
export type BlogTag                   = typeof blogTags.$inferSelect;
export type BlogPost                  = typeof blogPosts.$inferSelect;
export type NewBlogPost               = typeof blogPosts.$inferInsert;
export type BlogPostTranslation       = typeof blogPostTranslations.$inferSelect;
export type NewBlogPostTranslation    = typeof blogPostTranslations.$inferInsert;
export type BlogCategoryTranslation   = typeof blogCategoryTranslations.$inferSelect;
export type BlogTagTranslation        = typeof blogTagTranslations.$inferSelect;

// ── Site Settings ─────────────────────────────────────────────────────────────

export const siteSettings = pgTable(
  "site_settings",
  {
    key:       varchar("key", { length: 100 }).primaryKey(),
    value:     text("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export type SiteSetting = typeof siteSettings.$inferSelect;

// ── Admin işlem kaydı (drizzle/0013) ─────────────────────────────────────────

/**
 * Yönetim paneli işlem kaydı — karar K9.
 *
 * YABANCI ANAHTAR YOK (`productId`): ürün silinse bile iz kalmalıdır.
 * `actor` yalnızca admin KULLANICI ADIDIR; parola, token, oturum kimliği,
 * e-posta veya IP yazılmaz. `beforeState` / `afterState` yalnızca ilgili
 * alanın eski/yeni değerini taşır ve `src/lib/audit-log.ts` içindeki BEYAZ
 * LİSTEDEN geçer. Veritabanında ayrıca `ck_admin_audit_no_secrets` kısıtı
 * vardır (ikinci savunma).
 *
 * Kullanılabilirlik koşulu: `0013` hedef veritabanında UYGULANMIŞ olmalı.
 * Dev'de 2026-11-18'de uygulandı. Production'da HENÜZ YOK.
 */
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id:          uuid("id").defaultRandom().primaryKey(),
    actor:       varchar("actor", { length: 200 }),
    action:      varchar("action", { length: 60 }).notNull(),
    entity:      varchar("entity", { length: 40 }).default("product").notNull(),
    productId:   uuid("product_id"),
    beforeState: jsonb("before_state"),
    afterState:  jsonb("after_state"),
    outcome:     varchar("outcome", { length: 20 }).notNull(),
    reason:      text("reason"),
    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_admin_audit_created").on(table.createdAt),
    index("idx_admin_audit_product").on(table.productId),
  ]
);

export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLog.$inferInsert;

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
