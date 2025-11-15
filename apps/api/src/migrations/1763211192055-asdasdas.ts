import {MigrationInterface, QueryRunner} from "typeorm";

export class Asdasdas1763211192055 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsBundlecomponents"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsBundlecomponents" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsBundlecomponents"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsBundlecomponents" text`, undefined);
   }

}
