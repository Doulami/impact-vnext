import {MigrationInterface, QueryRunner} from "typeorm";

export class FixBundleDiscountTypeConstraint1763109823666 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "bundle" ALTER COLUMN "discountType" SET NOT NULL`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "bundle" ALTER COLUMN "discountType" DROP NOT NULL`, undefined);
   }

}
