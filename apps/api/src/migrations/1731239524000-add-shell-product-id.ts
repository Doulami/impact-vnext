import {MigrationInterface, QueryRunner} from "typeorm";

export class AddShellProductId1731239524000 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        // Check if bundle table exists before trying to add column
        const tableExists = await queryRunner.hasTable("bundle");
        if (tableExists) {
            await queryRunner.query(`ALTER TABLE "bundle" ADD COLUMN IF NOT EXISTS "shellProductId" character varying`, undefined);
        }
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        const tableExists = await queryRunner.hasTable("bundle");
        if (tableExists) {
            await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN IF EXISTS "shellProductId"`, undefined);
        }
   }

}
