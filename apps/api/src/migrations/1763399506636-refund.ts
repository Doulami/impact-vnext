import {MigrationInterface, QueryRunner} from "typeorm";

export class Refund1763399506636 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order" ADD "customFieldsPointsreleased" integer DEFAULT '0'`, undefined);
        await queryRunner.query(`ALTER TABLE "order" ADD "customFieldsPointsrefunded" integer DEFAULT '0'`, undefined);
        await queryRunner.query(`ALTER TABLE "order" ADD "customFieldsPointsremoved" integer DEFAULT '0'`, undefined);
        await queryRunner.query(`ALTER TYPE "public"."reward_transaction_type_enum" RENAME TO "reward_transaction_type_enum_old"`, undefined);
        await queryRunner.query(`CREATE TYPE "public"."reward_transaction_type_enum" AS ENUM('EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED', 'RELEASED', 'REFUNDED', 'REMOVED')`, undefined);
        await queryRunner.query(`ALTER TABLE "reward_transaction" ALTER COLUMN "type" TYPE "public"."reward_transaction_type_enum" USING "type"::"text"::"public"."reward_transaction_type_enum"`, undefined);
        await queryRunner.query(`DROP TYPE "public"."reward_transaction_type_enum_old"`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TYPE "public"."reward_transaction_type_enum_old" AS ENUM('EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED')`, undefined);
        await queryRunner.query(`ALTER TABLE "reward_transaction" ALTER COLUMN "type" TYPE "public"."reward_transaction_type_enum_old" USING "type"::"text"::"public"."reward_transaction_type_enum_old"`, undefined);
        await queryRunner.query(`DROP TYPE "public"."reward_transaction_type_enum"`, undefined);
        await queryRunner.query(`ALTER TYPE "public"."reward_transaction_type_enum_old" RENAME TO "reward_transaction_type_enum"`, undefined);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "customFieldsPointsremoved"`, undefined);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "customFieldsPointsrefunded"`, undefined);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "customFieldsPointsreleased"`, undefined);
   }

}
