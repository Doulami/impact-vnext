import {MigrationInterface, QueryRunner} from "typeorm";

export class Customfieldsitewideandmaxcumulativediscount1763136811897 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsBundlesitewidepromosaffectbundles" character varying(255) DEFAULT 'Exclude'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsBundlemaxcumulativediscountpct" double precision DEFAULT '0.5'`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsBundlemaxcumulativediscountpct"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsBundlesitewidepromosaffectbundles"`, undefined);
   }

}
