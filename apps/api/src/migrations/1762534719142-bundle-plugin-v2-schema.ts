import {MigrationInterface, QueryRunner} from "typeorm";

export class BundlePluginV2Schema1762534719142 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        // Drop old FKs & indexes if they exist (idempotent)
        await queryRunner.query(`ALTER TABLE "bundle_item" DROP CONSTRAINT IF EXISTS "FK_bundle_item_productVariantId"`);
        await queryRunner.query(`ALTER TABLE "bundle_item" DROP CONSTRAINT IF EXISTS "FK_bundle_item_bundleId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_product_isBundle"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_product_bundleId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bundle_item_bundleId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bundle_item_productVariantId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bundle_item_displayOrder"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bundle_item_unique"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bundle_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bundle_discountType"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bundle_enabled"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bundle_category"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bundle_name"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_bundle_slug"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "CHK_bundle_discount_fixed"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "CHK_bundle_percent_range"`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT IF EXISTS "CHK_bundle_fixed_positive"`);

        // Safe drops of columns (if they exist)
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN IF EXISTS "customFieldsBundleversion"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN IF EXISTS "customFieldsBundlecomponentqty"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN IF EXISTS "customFieldsBaseunitprice"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN IF EXISTS "customFieldsEffectiveunitprice"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN IF EXISTS "customFieldsBundlepctapplied"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN IF EXISTS "customFieldsBundleadjamount"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN IF EXISTS "customFieldsBundleshare"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN IF EXISTS "customFieldsIsbundleheader"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN IF EXISTS "customFieldsBundlekey"`);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN IF EXISTS "customFieldsBundlename"`);

        // New fields / alterations
        await queryRunner.query(`ALTER TABLE "promotion" ADD COLUMN IF NOT EXISTS "customFieldsBundlepolicy" character varying(255) DEFAULT 'inherit'`);
        await queryRunner.query(`ALTER TABLE "promotion" ADD COLUMN IF NOT EXISTS "customFieldsBundleaware" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "bundle_item" ADD COLUMN IF NOT EXISTS "customFields" text`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "lastRecomputedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "customFields" text`);
        await queryRunner.query(`ALTER TABLE "bundle_item" DROP COLUMN IF EXISTS "unitPrice"`);
        await queryRunner.query(`ALTER TABLE "bundle_item" ADD COLUMN IF NOT EXISTS "unitPrice" numeric(10,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "bundle" ALTER COLUMN "tags" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bundle" ALTER COLUMN "tags" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "price"`);
        await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "price" numeric(10,2)`);

        // Recreate FKs (conditionally)
        const fkBundle = await queryRunner.query(`SELECT 1 FROM pg_constraint WHERE conname='FK_21f62678875562cfa8afe7257a2'`);
        if (fkBundle.length === 0) {
            await queryRunner.query(`ALTER TABLE "bundle_item" ADD CONSTRAINT "FK_21f62678875562cfa8afe7257a2" FOREIGN KEY ("bundleId") REFERENCES "bundle"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        }
        const fkVariant = await queryRunner.query(`SELECT 1 FROM pg_constraint WHERE conname='FK_c4fe00612215a91aeb40db671e1'`);
        if (fkVariant.length === 0) {
            await queryRunner.query(`ALTER TABLE "bundle_item" ADD CONSTRAINT "FK_c4fe00612215a91aeb40db671e1" FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        }
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "bundle_item" DROP CONSTRAINT "FK_c4fe00612215a91aeb40db671e1"`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle_item" DROP CONSTRAINT "FK_21f62678875562cfa8afe7257a2"`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN "price"`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" ADD "price" integer NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" ALTER COLUMN "tags" SET DEFAULT '[]'`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" ALTER COLUMN "tags" SET NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle_item" DROP COLUMN "unitPrice"`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle_item" ADD "unitPrice" integer NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN "customFields"`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN "lastRecomputedAt"`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle_item" DROP COLUMN "customFields"`, undefined);
        await queryRunner.query(`ALTER TABLE "promotion" DROP COLUMN "customFieldsBundleaware"`, undefined);
        await queryRunner.query(`ALTER TABLE "promotion" DROP COLUMN "customFieldsBundlepolicy"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsBundlename" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsBundlekey" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsIsbundleheader" boolean DEFAULT false`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsBundleshare" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsBundleadjamount" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsBundlepctapplied" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsEffectiveunitprice" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsBaseunitprice" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsBundlecomponentqty" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsBundleversion" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" ADD CONSTRAINT "CHK_bundle_fixed_positive" CHECK ((("discountType" <> 'fixed'::bundle_discounttype_enum) OR ("fixedPrice" >= 0)))`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" ADD CONSTRAINT "CHK_bundle_percent_range" CHECK ((("discountType" <> 'percent'::bundle_discounttype_enum) OR (("percentOff" >= (0)::numeric) AND ("percentOff" <= (100)::numeric))))`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" ADD CONSTRAINT "CHK_bundle_discount_fixed" CHECK (((("discountType" = 'fixed'::bundle_discounttype_enum) AND ("fixedPrice" IS NOT NULL) AND ("percentOff" IS NULL)) OR (("discountType" = 'percent'::bundle_discounttype_enum) AND ("percentOff" IS NOT NULL) AND ("fixedPrice" IS NULL))))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_bundle_slug" ON "bundle" ("slug") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_bundle_name" ON "bundle" ("name") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_bundle_category" ON "bundle" ("category") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_bundle_enabled" ON "bundle" ("enabled") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_bundle_discountType" ON "bundle" ("discountType") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_bundle_status" ON "bundle" ("status") `, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bundle_item_unique" ON "bundle_item" ("bundleId", "productVariantId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_bundle_item_displayOrder" ON "bundle_item" ("displayOrder") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_bundle_item_productVariantId" ON "bundle_item" ("productVariantId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_bundle_item_bundleId" ON "bundle_item" ("bundleId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_product_bundleId" ON "product" ("customFieldsBundleid") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_product_isBundle" ON "product" ("customFieldsIsbundle") `, undefined);
        await queryRunner.query(`ALTER TABLE "bundle_item" ADD CONSTRAINT "FK_bundle_item_bundleId" FOREIGN KEY ("bundleId") REFERENCES "bundle"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle_item" ADD CONSTRAINT "FK_bundle_item_productVariantId" FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`, undefined);
   }

}
