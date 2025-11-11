import {MigrationInterface, QueryRunner} from "typeorm";

export class AddBundleReservedOpen1762868851481 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "bundle" ADD "bundleReservedOpen" integer NOT NULL DEFAULT '0'`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN "bundleReservedOpen"`, undefined);
   }

}
