import {MigrationInterface, QueryRunner} from "typeorm";

export class FixBundleCustomfields1762444026382 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsBundleparent" boolean DEFAULT false`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsBundleid" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsBundlechild" boolean DEFAULT false`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsBundleparentlineid" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "bundle" ALTER COLUMN "customFields" DROP NOT NULL`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "bundle" ALTER COLUMN "customFields" SET NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundleparentlineid"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundlechild"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundleid"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsBundleparent"`, undefined);
   }

}
