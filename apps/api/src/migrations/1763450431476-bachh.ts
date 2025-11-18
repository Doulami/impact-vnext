import {MigrationInterface, QueryRunner} from "typeorm";

export class Bachh1763450431476 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        // Create enum type only if it doesn't exist
        await queryRunner.query(`DO $$ BEGIN
            CREATE TYPE "public"."nutrition_batch_row_group_enum" AS ENUM('macro', 'vitamin', 'mineral', 'amino', 'other');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;`, undefined);
        
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "nutrition_batch_row" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "nutritionBatchId" integer NOT NULL, "name" text NOT NULL, "group" "public"."nutrition_batch_row_group_enum" NOT NULL, "unit" character varying NOT NULL, "valuePerServing" numeric(12,3), "valuePer100g" numeric(12,3), "referenceIntakePercentPerServing" numeric(8,2), "displayOrder" integer NOT NULL DEFAULT '0', "id" SERIAL NOT NULL, CONSTRAINT "PK_5edc248a67dc6a730af379bee40" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_5cc47bd56e21a2a1a0d9cba976" ON "nutrition_batch_row" ("nutritionBatchId") `, undefined);
        
        await queryRunner.query(`DO $$ BEGIN
            CREATE TYPE "public"."nutrition_batch_servingsizeunit_enum" AS ENUM('g', 'ml', 'tablet', 'capsule', 'scoop', 'sachet', 'dosette', 'piece', 'serving');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;`, undefined);
        
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "nutrition_batch" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "productVariantId" integer NOT NULL, "batchCode" character varying NOT NULL, "productionDate" TIMESTAMP, "expiryDate" TIMESTAMP, "isCurrentForWebsite" boolean NOT NULL DEFAULT false, "servingSizeValue" numeric(10,2) NOT NULL, "servingSizeUnit" "public"."nutrition_batch_servingsizeunit_enum" NOT NULL, "servingLabel" text NOT NULL, "servingsPerContainer" integer, "ingredientsText" text, "allergyAdviceText" text, "recommendedUseText" text, "storageAdviceText" text, "warningsText" text, "shortLabelDescription" text, "referenceIntakeFootnoteText" text, "notesInternal" text, "coaAssetId" integer, "id" SERIAL NOT NULL, CONSTRAINT "PK_ad22f2500e9ebcb1e9210d087f0" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ea4121acd682398986f90475c9" ON "nutrition_batch" ("productVariantId") `, undefined);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_3527cc0a2f28c9a4bd9cdc14cd" ON "nutrition_batch" ("isCurrentForWebsite") `, undefined);
        await queryRunner.query(`DO $$ BEGIN
            ALTER TABLE "nutrition_batch_row" ADD CONSTRAINT "FK_5cc47bd56e21a2a1a0d9cba9763" FOREIGN KEY ("nutritionBatchId") REFERENCES "nutrition_batch"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;`, undefined);
        await queryRunner.query(`DO $$ BEGIN
            ALTER TABLE "nutrition_batch" ADD CONSTRAINT "FK_ea4121acd682398986f90475c91" FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;`, undefined);
        await queryRunner.query(`DO $$ BEGIN
            ALTER TABLE "nutrition_batch" ADD CONSTRAINT "FK_adbb6f3b025c059cc526edf3535" FOREIGN KEY ("coaAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "nutrition_batch" DROP CONSTRAINT "FK_adbb6f3b025c059cc526edf3535"`, undefined);
        await queryRunner.query(`ALTER TABLE "nutrition_batch" DROP CONSTRAINT "FK_ea4121acd682398986f90475c91"`, undefined);
        await queryRunner.query(`ALTER TABLE "nutrition_batch_row" DROP CONSTRAINT "FK_5cc47bd56e21a2a1a0d9cba9763"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_3527cc0a2f28c9a4bd9cdc14cd"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_ea4121acd682398986f90475c9"`, undefined);
        await queryRunner.query(`DROP TABLE "nutrition_batch"`, undefined);
        await queryRunner.query(`DROP TYPE "public"."nutrition_batch_servingsizeunit_enum"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_5cc47bd56e21a2a1a0d9cba976"`, undefined);
        await queryRunner.query(`DROP TABLE "nutrition_batch_row"`, undefined);
        await queryRunner.query(`DROP TYPE "public"."nutrition_batch_row_group_enum"`, undefined);
   }

}
