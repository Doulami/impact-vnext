import {MigrationInterface, QueryRunner} from "typeorm";

export class Orderline1763379023895 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsPointsredeemvalue"`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsPointsredeemvalue" integer`, undefined);
   }

}
