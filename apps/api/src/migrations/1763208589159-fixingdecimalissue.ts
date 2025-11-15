import {MigrationInterface, QueryRunner} from "typeorm";

export class Fixingdecimalissue1763208589159 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "reward_point_settings" ALTER COLUMN "earnRate" SET DEFAULT 1`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "reward_point_settings" ALTER COLUMN "earnRate" SET DEFAULT '1'`, undefined);
   }

}
