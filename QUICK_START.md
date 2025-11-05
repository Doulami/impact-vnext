# Quick Start Guide

## Starting the Development Environment

### 1. Docker Containers

Make sure you're using the `default` docker context:

```bash
docker context use default
```

Start the required containers:

```bash
# Check if containers are running
docker ps

# If not running, start them:
docker start vendure-postgres impact-postgres impact-redis
```

**Expected containers:**
- `vendure-postgres` → port 6543 (Vendure database)
- `impact-postgres` → port 5432 (Strapi/general database)  
- `impact-redis` → port 6379 (Cache/sessions)

### 2. Start Vendure API (Backend)

```bash
cd apps/api
npm run dev
```

✅ Vendure will start on **http://localhost:3000**
- Shop API: http://localhost:3000/shop-api
- Admin API: http://localhost:3000/admin-api
- Admin UI: http://localhost:3000/admin

### 3. Start Next.js Web (Storefront)

```bash
cd apps/web
npm run dev
```

✅ Next.js will start on **http://localhost:3001**

### 4. Start Strapi CMS (Optional - for content management)

```bash
cd apps/cms
npm run develop
```

✅ Strapi will start on **http://localhost:1337**

## Ports Summary

| Service | Port | URL |
|---------|------|-----|
| Vendure API | 3000 | http://localhost:3000/shop-api |
| Next.js Web | 3001 | http://localhost:3001 |
| Strapi CMS | 1337 | http://localhost:1337 |
| PostgreSQL (Vendure) | 6543 | localhost:6543 |
| PostgreSQL (General) | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

## Troubleshooting

### Port already in use
If you get "address already in use" errors:
```bash
# Find what's using the port
lsof -i :3000  # or :3001, etc.

# Kill the process
kill <PID>
```

### Docker context issues
Docker Desktop uses a different context. Switch to default:
```bash
docker context use default
docker ps  # Should show your containers
```

### Vendure not connecting to database
Check that vendure-postgres is running and .env has correct credentials:
```bash
docker ps | grep vendure-postgres
cat apps/api/.env | grep DB_
```

## Database Credentials

### Vendure Database (vendure-postgres)
- Host: localhost
- Port: 6543
- Database: vendure
- User: vendure
- Password: 3Ru2esG7OcF7r6vN1uhp2w

### General Database (impact-postgres)
- Host: localhost  
- Port: 5432
- Database: impact_nutrition
- User: impact_user
- Password: impact_password
