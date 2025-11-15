import {MigrationInterface, QueryRunner} from "typeorm";

export class FixRedeemRateDefault1763148000000 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        // No-op migration: The database already has the correct default value (0.01)
        // This migration exists to acknowledge TypeORM's schema comparison warning
        // The warning occurs because of how PostgreSQL normalizes numeric defaults
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        // No-op
   }

}
