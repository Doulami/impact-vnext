import {MigrationInterface, QueryRunner} from "typeorm";

export class Newrewardplugin1763139061744 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "reward_point_settings" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "enabled" boolean NOT NULL DEFAULT false, "earnRate" numeric(10,4) NOT NULL DEFAULT '1', "redeemRate" numeric(10,4) NOT NULL DEFAULT '0.01', "minRedeemAmount" integer NOT NULL DEFAULT '100', "maxRedeemPerOrder" integer NOT NULL DEFAULT '10000', "id" SERIAL NOT NULL, CONSTRAINT "PK_503b6fd56c170f6ec8d1f1d6425" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "customer_reward_points" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "customerId" integer NOT NULL, "balance" integer NOT NULL DEFAULT '0', "lifetimeEarned" integer NOT NULL DEFAULT '0', "lifetimeRedeemed" integer NOT NULL DEFAULT '0', "id" SERIAL NOT NULL, CONSTRAINT "REL_4b8c2385c17f55932c27d926d2" UNIQUE ("customerId"), CONSTRAINT "PK_0500e6f7ee7d80e8dc869acc035" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TYPE "public"."reward_transaction_type_enum" AS ENUM('EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED')`, undefined);
        await queryRunner.query(`CREATE TABLE "reward_transaction" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "customerId" integer NOT NULL, "orderId" integer, "type" "public"."reward_transaction_type_enum" NOT NULL, "points" integer NOT NULL, "orderTotal" integer, "description" text NOT NULL, "metadata" text, "id" SERIAL NOT NULL, CONSTRAINT "PK_e3cdd05ad65dfb5c8a2c0254eec" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_f4739234943f30021fa7c7ebf4" ON "reward_transaction" ("customerId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_f16a2670d6ee887a1a3f202870" ON "reward_transaction" ("orderId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_5c7da05460d7f1dd504e24eadc" ON "reward_transaction" ("customerId", "createdAt") `, undefined);
        await queryRunner.query(`ALTER TABLE "order" ADD "customFieldsPointsredeemed" integer DEFAULT '0'`, undefined);
        await queryRunner.query(`ALTER TABLE "order" ADD "customFieldsPointsearned" integer DEFAULT '0'`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD "customFieldsPointsredeemvalue" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "customer_reward_points" ADD CONSTRAINT "FK_4b8c2385c17f55932c27d926d25" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "reward_transaction" ADD CONSTRAINT "FK_f4739234943f30021fa7c7ebf41" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "reward_transaction" ADD CONSTRAINT "FK_f16a2670d6ee887a1a3f2028708" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "reward_transaction" DROP CONSTRAINT "FK_f16a2670d6ee887a1a3f2028708"`, undefined);
        await queryRunner.query(`ALTER TABLE "reward_transaction" DROP CONSTRAINT "FK_f4739234943f30021fa7c7ebf41"`, undefined);
        await queryRunner.query(`ALTER TABLE "customer_reward_points" DROP CONSTRAINT "FK_4b8c2385c17f55932c27d926d25"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN "customFieldsPointsredeemvalue"`, undefined);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "customFieldsPointsearned"`, undefined);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "customFieldsPointsredeemed"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_5c7da05460d7f1dd504e24eadc"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_f16a2670d6ee887a1a3f202870"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_f4739234943f30021fa7c7ebf4"`, undefined);
        await queryRunner.query(`DROP TABLE "reward_transaction"`, undefined);
        await queryRunner.query(`DROP TYPE "public"."reward_transaction_type_enum"`, undefined);
        await queryRunner.query(`DROP TABLE "customer_reward_points"`, undefined);
        await queryRunner.query(`DROP TABLE "reward_point_settings"`, undefined);
   }

}
