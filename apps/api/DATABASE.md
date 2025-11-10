# Database Connection - Bundle Plugin v2

## Docker PostgreSQL Container
- **Container Name**: `api-postgres_db-1`
- **Host**: localhost
- **Port**: 6543 (external) → 5432 (internal)
- **Database**: `vendure`
- **User**: `vendure`
- **Password**: `3Ru2esG7OcF7r6vN1uhp2w`

## Connection Commands

### Direct Docker Exec
```bash
docker exec -it api-postgres_db-1 psql -U vendure -d vendure
```

### From Host (if needed)
```bash
psql -h localhost -p 6543 -U vendure -d vendure
```

## Current Status
- Bundle table exists with v1 schema (12 columns)
- Bundle Plugin v2 migrations need to be applied
- New columns to be added: status, discountType, fixedPrice, percentOff, version, allowExternalPromos, brokenReason

## Migration Status
- Migration `BundlePluginV2Schema1762446000000` needs to run
- Fix migration `FixBundleNullValues1762446002000` created to handle null values