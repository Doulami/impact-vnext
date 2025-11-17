import {MigrationInterface, QueryRunner} from "typeorm";

export class Ordrrefrsh1763383460599 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order" ADD "customFieldsPointsreserved" integer DEFAULT '0'`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "customFieldsPointsreserved"`, undefined);
   }

}
