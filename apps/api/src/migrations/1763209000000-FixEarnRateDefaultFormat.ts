import {MigrationInterface, QueryRunner} from "typeorm";

export class FixEarnRateDefaultFormat1763209000000 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "reward_point_settings" ALTER COLUMN "earnRate" DROP DEFAULT`, undefined);
        await queryRunner.query(`ALTER TABLE "reward_point_settings" ALTER COLUMN "earnRate" SET DEFAULT '1'`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "reward_point_settings" ALTER COLUMN "earnRate" SET DEFAULT 1`, undefined);
   }

}
