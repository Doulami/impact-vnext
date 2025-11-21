# Production Deployment Guide - Admin UI

## Overview
This guide covers deploying the Admin UI to production using pre-compiled static files following Vendure best practices.

---

## Part 1: Changes Already Applied to Dev ✅

All code changes have been applied to dev and are ready to commit:

### Files Modified/Added:
1. ✅ `apps/api/package.json` - Updated Vendure packages, added axios, added compile script
2. ✅ `apps/api/compile-admin-ui.ts` - NEW compilation script
3. ✅ `apps/api/src/plugins/nutrition-batch-plugin/ui/nutrition-batch-tab.component.ts` - Fixed
4. ✅ `apps/api/src/plugins/clictopay-plugin/services/clictopay-api.service.ts` - Fixed
5. ✅ `PRODUCTION_DEPLOYMENT_GUIDE.md` - This file
6. ✅ `READY_TO_COMMIT.md` - Summary

**Note:** `apps/api/src/vendure-config.ts` was NOT modified in dev - AdminUiPlugin stays commented out so your dev environment continues to work with runtime compilation.

### Ready to Commit:
```bash
cd /home/dmiku/dev/impact-vnext
git add .
git commit -m "feat: Add Admin UI pre-compilation support for production

- Update Vendure packages to 3.5.0
- Add compile-admin-ui script for production deployment
- Fix TypeScript errors in nutrition-batch and clictopay plugins
- Add axios dependency
- Add production deployment guide

Changes are backward compatible and don't affect dev environment."
git push origin main
```

### Test Dev First (Optional):
```bash
cd /home/dmiku/dev/impact-vnext/apps/api
npm install
npm run dev  # Should work exactly as before
```

---

## Part 3: Production Server - After Pulling from Git

### Step 1: Pull Changes
```bash
cd /var/www/vhosts/impactnutrition.tn/impact-vnext
git pull origin main  # or your branch name
```

### Step 2: Update .env File
**Edit:** `/var/www/vhosts/impactnutrition.tn/impact-vnext/apps/api/.env`

```bash
# Use production values
APP_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5433              # Your production DB port
DB_NAME=vendure_prod      # Your production DB name
DB_USERNAME=vendure
DB_PASSWORD=<your_prod_password>

# Keep your production credentials
SUPERADMIN_USERNAME=<your_prod_admin>
SUPERADMIN_PASSWORD=<your_prod_password>
```

### Step 3: Install Dependencies
```bash
cd /var/www/vhosts/impactnutrition.tn/impact-vnext/apps/api
npm install
```

### Step 4: Compile Admin UI (ONE TIME)
```bash
npm run compile:admin-ui
```
This creates the static Admin UI files in `admin-ui/dist/browser/`

### Step 5: Build API
```bash
npm run build
```

### Step 6: Update vendure-config.ts (Production Only)
**Edit:** `/var/www/vhosts/impactnutrition.tn/impact-vnext/apps/api/src/vendure-config.ts`

Find the AdminUiPlugin section (around line 136) and uncomment it:

```typescript
// Change FROM:
// AdminUiPlugin.init({

// TO:
AdminUiPlugin.init({
    route: 'admin',
    port: 3002,
    app: {
        // Angular 19 outputs to dist/browser/ subdirectory
        path: path.join(__dirname, '../admin-ui/dist/browser'),
    },
    adminUiConfig: {
        apiHost: 'https://api.impactnutrition.tn',  // UPDATE with your domain
        apiPort: 443,                                 // UPDATE with your port
    },
}),
```

**Important:** Update `apiHost` and `apiPort` to match your production domain!

### Step 7: Rebuild After Config Change
```bash
npm run build
```

### Step 8: Restart Server
```bash
pm2 restart all
# or however you manage your server
```

### Step 9: Verify
- Admin UI: https://your-domain.com:3002/admin (or your configured route)
- API: https://your-domain.com/admin-api

---

## Important Notes

### Dev Environment Safety:
✅ All changes are backward compatible  
✅ `npm run dev` continues to work as before  
✅ Runtime compilation still works in dev mode  
✅ No database changes  

### Production Environment:
✅ Pre-compiled Admin UI (faster, no runtime compilation)  
✅ Works with Angular 19  
✅ All custom plugins included  
✅ Database configuration preserved  

### When to Recompile Admin UI:
You only need to run `npm run compile:admin-ui` again if you:
- Modify UI extension code
- Add new UI extensions
- Update Vendure packages

---

## Troubleshooting

### If Admin UI doesn't load:
1. Check that `admin-ui/dist/browser/` exists and has files
2. Verify path in vendure-config.ts matches Angular 19 output structure
3. Check browser console for API connection errors
4. Verify apiHost and apiPort are correct in adminUiConfig

### If compilation fails:
1. Ensure all dependencies installed: `npm install`
2. Check Node version: `node --version` (should be 22.x)
3. Clear old builds: `rm -rf admin-ui dist` then retry

---

## Rollback Plan

If something goes wrong, you can disable Admin UI:
1. Comment out AdminUiPlugin in vendure-config.ts
2. Run `npm run build`
3. Restart server
4. Use Dashboard plugin or GraphiQL instead

---

**Questions?** All changes are documented in this file and tested in `/home/dmiku/prod/impact-vnext/`
