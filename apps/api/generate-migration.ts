import { DataSource } from 'typeorm';
import { config } from './src/vendure-config';

async function generateMigration() {
    const dataSource = new DataSource(config.dbConnectionOptions as any);
    await dataSource.initialize();
    
    const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();
    
    console.log('Schema differences detected:');
    console.log(sqlInMemory.upQueries.map(q => q.query).join('\n'));
    
    await dataSource.destroy();
}

generateMigration().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});
