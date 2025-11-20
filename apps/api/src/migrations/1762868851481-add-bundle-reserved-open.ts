import {MigrationInterface, QueryRunner} from "typeorm";

export class AddBundleReservedOpen1762868851481 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        const tableExists = await queryRunner.hasTable("bundle");
        if (tableExists) {
            await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "bundleReservedOpen" integer NOT NULL DEFAULT '0'`, undefined);
        }
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        const tableExists = await queryRunner.hasTable("bundle");
        if (tableExists) {
            await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "bundleReservedOpen"`, undefined);
        }
   }

}
