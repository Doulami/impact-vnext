import {MigrationInterface, QueryRunner} from "typeorm";

export class FixPoints1763377086627 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order" ADD "customFieldsPointsdiscountvalue" integer DEFAULT '0'`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "customFieldsPointsdiscountvalue"`, undefined);
   }

}
