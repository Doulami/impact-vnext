import 'dotenv/config';
import { DataSource } from 'typeorm';
import { config } from './src/vendure-config';

export const AppDataSource = new DataSource({
    ...config.dbConnectionOptions,
    entities: [
        // Include all Vendure core entities
        'node_modules/@vendure/core/dist/entity/**/*.js',
        // Include our custom entities
        'src/**/*.entity.ts',
        'src/**/entities/*.ts',
    ],
    migrations: ['src/migrations/*.ts'],
} as any);