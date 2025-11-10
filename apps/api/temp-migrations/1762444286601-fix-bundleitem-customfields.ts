import {MigrationInterface, QueryRunner} from "typeorm";

export class FixBundleitemCustomfields1762444286601 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "bundle_item" ALTER COLUMN "customFields" DROP NOT NULL`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "bundle_item" ALTER COLUMN "customFields" SET NOT NULL`, undefined);
   }

}
