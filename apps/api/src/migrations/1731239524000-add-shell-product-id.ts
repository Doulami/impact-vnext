import {MigrationInterface, QueryRunner} from "typeorm";

export class AddShellProductId1731239524000 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "bundle" ADD "shellProductId" character varying`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "bundle" DROP COLUMN "shellProductId"`, undefined);
   }

}
