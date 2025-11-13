import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Align DB schema with Bundle v2 entities and Vendure config:
 * - Convert status/discountType to enums
 * - Add missing columns and indexes
 * - Add FKs for featuredAsset and bundle_assets join table
 * - Add customFields columns on product and order_line
 * - Adjust bundle_item columns and constraints
 *
 * Idempotent where possible.
 */
export class AlignBundleV2Schema1763000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop potentially conflicting constraints/indexes (safe, if exist)
    await queryRunner.query(`ALTER TABLE "bundle_item" DROP CONSTRAINT IF EXISTS "FK_c4fe00612215a91aeb40db671e1"`);
    await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "FK_bundle_featuredAsset"`);
    await queryRunner.query(`ALTER TABLE "bundle_assets" DROP CONSTRAINT IF EXISTS "FK_bundle_assets_asset"`);
    await queryRunner.query(`ALTER TABLE "bundle_assets" DROP CONSTRAINT IF EXISTS "FK_bundle_assets_bundle"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bundle_featuredAssetId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bundle_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bundle_assets_bundle_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bundle_assets_asset_id"`);
    await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "CHK_bundle_discount_type_valid"`);

    // Product custom fields
    await queryRunner.query(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "customFieldsIsbundle" boolean DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "customFieldsBundleid" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "customFieldsBundleprice" integer`);
    await queryRunner.query(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "customFieldsBundleavailability" integer`);

    // OrderLine custom fields
    await queryRunner.query(`ALTER TABLE "order_line" ADD COLUMN IF NOT EXISTS "customFieldsBundlekey" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "order_line" ADD COLUMN IF NOT EXISTS "customFieldsBundlename" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "order_line" ADD COLUMN IF NOT EXISTS "customFieldsBundleversion" integer`);
    await queryRunner.query(`ALTER TABLE "order_line" ADD COLUMN IF NOT EXISTS "customFieldsIsbundleheader" boolean DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "order_line" ADD COLUMN IF NOT EXISTS "customFieldsBundlecomponentqty" integer`);
    await queryRunner.query(`ALTER TABLE "order_line" ADD COLUMN IF NOT EXISTS "customFieldsBaseunitprice" integer`);
    await queryRunner.query(`ALTER TABLE "order_line" ADD COLUMN IF NOT EXISTS "customFieldsEffectiveunitprice" integer`);
    await queryRunner.query(`ALTER TABLE "order_line" ADD COLUMN IF NOT EXISTS "customFieldsBundlepctapplied" double precision`);
    await queryRunner.query(`ALTER TABLE "order_line" ADD COLUMN IF NOT EXISTS "customFieldsBundleadjamount" integer`);
    await queryRunner.query(`ALTER TABLE "order_line" ADD COLUMN IF NOT EXISTS "customFieldsBundleshare" double precision`);

    // bundle_item additions
    await queryRunner.query(`ALTER TABLE "bundle_item" ADD COLUMN IF NOT EXISTS "weight" numeric(12,4)`);
    await queryRunner.query(`ALTER TABLE "bundle_item" ADD COLUMN IF NOT EXISTS "unitPriceSnapshot" integer`);
    await queryRunner.query(`ALTER TABLE "bundle_item" ALTER COLUMN "displayOrder" SET DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "bundle_item" ALTER COLUMN "displayOrder" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "bundle_item" ALTER COLUMN "customFields" DROP NOT NULL`);

    // bundle columns
    await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "validTo" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "bundleCap" integer`);
    await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "brokenReason" text`);

    // slug unique
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UQ_ce8703fb1baab9336f926baf3ad'
      ) THEN
        ALTER TABLE "bundle" ADD CONSTRAINT "UQ_ce8703fb1baab9336f926baf3ad" UNIQUE ("slug");
      END IF;
    END $$;`);

    // Convert status to enum
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bundle_status_enum') THEN
        CREATE TYPE "public"."bundle_status_enum" AS ENUM('DRAFT', 'ACTIVE', 'BROKEN', 'ARCHIVED');
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='bundle' AND column_name='status' AND udt_name <> 'bundle_status_enum'
      ) THEN
        ALTER TABLE "bundle" ALTER COLUMN "status" DROP DEFAULT;
        ALTER TABLE "bundle" ALTER COLUMN "status" TYPE "public"."bundle_status_enum" USING "status"::"public"."bundle_status_enum";
        ALTER TABLE "bundle" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
      ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='bundle' AND column_name='status'
      ) THEN
        ALTER TABLE "bundle" ADD COLUMN "status" "public"."bundle_status_enum" NOT NULL DEFAULT 'DRAFT';
      END IF;
    END $$;`);

    // Convert discountType to enum
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bundle_discounttype_enum') THEN
        CREATE TYPE "public"."bundle_discounttype_enum" AS ENUM('fixed', 'percent');
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='bundle' AND column_name='discountType' AND udt_name <> 'bundle_discounttype_enum'
      ) THEN
        ALTER TABLE "bundle" ALTER COLUMN "discountType" TYPE "public"."bundle_discounttype_enum" USING "discountType"::"public"."bundle_discounttype_enum";
      ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='bundle' AND column_name='discountType'
      ) THEN
        ALTER TABLE "bundle" ADD COLUMN "discountType" "public"."bundle_discounttype_enum" NOT NULL;
      END IF;
    END $$;`);

    // bundle.customFields nullable for compatibility
    await queryRunner.query(`ALTER TABLE "bundle" ALTER COLUMN "customFields" DROP NOT NULL`);

    // bundle_assets indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_3ed759e85b5b9dbe80235acd02" ON "bundle_assets" ("bundle_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_214cf4c45440e49b41b6cdb84f" ON "bundle_assets" ("asset_id")`);

    // Recreate FKs
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_c4fe00612215a91aeb40db671e1') THEN
        ALTER TABLE "bundle_item" ADD CONSTRAINT "FK_c4fe00612215a91aeb40db671e1"
          FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_799a40e6f343748afdd54dd0ab4') THEN
        ALTER TABLE "bundle" ADD CONSTRAINT "FK_799a40e6f343748afdd54dd0ab4"
          FOREIGN KEY ("featuredAssetId") REFERENCES "asset"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_3ed759e85b5b9dbe80235acd022') THEN
        ALTER TABLE "bundle_assets" ADD CONSTRAINT "FK_3ed759e85b5b9dbe80235acd022"
          FOREIGN KEY ("bundle_id") REFERENCES "bundle"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_214cf4c45440e49b41b6cdb84f4') THEN
        ALTER TABLE "bundle_assets" ADD CONSTRAINT "FK_214cf4c45440e49b41b6cdb84f4"
          FOREIGN KEY ("asset_id") REFERENCES "asset"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;`);

    // Restore index on bundle.status for queries
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bundle_status" ON "bundle" ("status")`);
  }

  // No-op down: intentionally skip reversing complex enum conversions and FKs
  public async down(): Promise<void> {
    return;
  }
}


