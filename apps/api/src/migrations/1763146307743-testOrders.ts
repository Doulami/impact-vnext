import {MigrationInterface, QueryRunner} from "typeorm";

export class TestOrders1763146307743 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "reward_point_settings" ALTER COLUMN "redeemRate" SET DEFAULT '0.01'`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "reward_point_settings" ALTER COLUMN "redeemRate" SET DEFAULT 0.01`, undefined);
   }

}
