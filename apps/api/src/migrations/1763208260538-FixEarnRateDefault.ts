import { MigrationInterface, QueryRunner } from "typeorm";

export class FixEarnRateDefault1763208260538 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reward_point_settings" ALTER COLUMN "earnRate" SET DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
