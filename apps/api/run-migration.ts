import { DataSource } from 'typeorm';
import { config } from './src/vendure-config';

async function runMigrations() {
    const dataSource = new DataSource(config.dbConnectionOptions as any);
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.destroy();
    console.log('Migrations completed successfully');
}

runMigrations().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
