import {MigrationInterface, QueryRunner} from "typeorm";

export class BundlePluginV2Schema1762534719142 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "bundle_item" DROP CONSTRAINT "FK_bundle_item_productVariantId"`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle_item" DROP CONSTRAINT "FK_bundle_item_bundleId"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_product_isBundle"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_product_bundleId"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_bundle_item_bundleId"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_bundle_item_productVariantId"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_bundle_item_displayOrder"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_bundle_item_unique"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_bundle_status"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_bundle_discountType"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_bundle_enabled"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_bundle_category"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_bundle_name"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_bundle_slug"`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT "CHK_bundle_discount_fixed"`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT "CHK_bundle_percent_range"`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" DROP CONSTRAINT "CHK_bundle_fixed_positive"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundleversion"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundlecomponentqty"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBaseunitprice"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsEffectiveunitprice"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundlepctapplied"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundleadjamount"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundleshare"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsIsbundleheader"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundlekey"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundlename"`, undefined);
        await queryRunner.query(`ALTER TABLE "promotion" ADD "customFieldsBundlepolicy" character varying(255) DEFAULT 'inherit'`, undefined);
        await queryRunner.query(`ALTER TABLE "promotion" ADD "customFieldsBundleaware" boolean DEFAULT false`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle_item" ADD "customFields" text`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" ADD "lastRecomputedAt" TIMESTAMP`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" ADD "customFields" text`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle_item" DROP COLUMN "unitPrice"`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle_item" ADD "unitPrice" numeric(10,2) NOT NULL DEFAULT '0'`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" ALTER COLUMN "tags" DROP NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" ALTER COLUMN "tags" DROP DEFAULT`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN "price"`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" ADD "price" numeric(10,2)`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle_item" ADD CONSTRAINT "FK_21f62678875562cfa8afe7257a2" FOREIGN KEY ("bundleId") REFERENCES "bundle"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle_item" ADD CONSTRAINT "FK_c4fe00612215a91aeb40db671e1" FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`, undefined);
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
