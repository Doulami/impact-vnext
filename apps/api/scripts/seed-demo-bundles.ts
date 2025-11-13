import { DataSource } from 'typeorm';
import { config } from '../src/vendure-config';

async function seed() {
  const dataSource = new DataSource(config.dbConnectionOptions as any);
  await dataSource.initialize();
  try {
    // Insert two demo bundles (without items) to validate storefront listing
    // If items are required later, extend this script to insert into bundle_item as well.
    await dataSource.query(`
      INSERT INTO "bundle" ("createdAt","updatedAt","name","slug","description","tags","customFields","status","discountType","fixedPrice","percentOff","version","allowExternalPromos","enabled")
      VALUES
      (NOW(), NOW(), 'Starter Stack', 'starter-stack', 'Great for beginners.', '[]', '{}', 'ACTIVE', 'fixed', 2999, NULL, 1, false, true)
      ON CONFLICT DO NOTHING;
    `);
    await dataSource.query(`
      INSERT INTO "bundle" ("createdAt","updatedAt","name","slug","description","tags","customFields","status","discountType","fixedPrice","percentOff","version","allowExternalPromos","enabled")
      VALUES
      (NOW(), NOW(), 'Muscle Builder', 'muscle-builder', 'Advanced performance bundle.', '[]', '{}', 'ACTIVE', 'percent', NULL, 15.00, 1, false, true)
      ON CONFLICT DO NOTHING;
    `);

    console.log('Demo bundles seeded.');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});


