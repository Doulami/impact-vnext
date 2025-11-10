# Vendure API & AdminUI Extensions Troubleshooting Guide

## Common Issues & Solutions

### 1. Web App Not Loading Data from Vendure

**Symptoms:** Next.js web app loads but no products/data from Vendure API

**Quick Fix:**
```bash
# 1. Verify Shop API is responding
curl -s http://localhost:3000/shop-api -H "Content-Type: application/json" -d '{"query":"{ products { items { id name } } }"}'

# 2. Check Next.js environment variables
grep SHOP_API apps/web/.env.local
# Should show: NEXT_PUBLIC_VENDURE_SHOP_API_URL=http://localhost:3000/shop-api

# 3. Find what port your web app is running on
lsof -i | grep "node.*LISTEN"
```

**Root Cause:** CORS configuration not allowing web app origin

**Permanent Fix:** Update `vendure-config.ts`:
```typescript
apiOptions: {
    // ... other config
    ...(IS_DEV ? {
        adminApiDebug: true,
        shopApiDebug: true,
        cors: {
            origin: [
                'http://localhost:3000',  // Vendure API
                'http://localhost:3001',  // Next.js (typical)
                'http://localhost:4200',  // AdminUI dev server
                'http://localhost:5173',  // Vite dev server
                // Add your production domains here
            ],
            credentials: true,
        },
    } : {}),
},
authOptions: {
    cookieOptions: {
        secret: process.env.COOKIE_SECRET,
        sameSite: 'lax',  // Required for cross-origin cookies
    },
},
```

### 2. AdminUI Extension Errors

**Symptoms:** `NullInjectorError: No provider for _DataService!`

**Root Cause:** AdminUI extensions can't use Vendure's internal services directly

**Solution:** Use fetch API instead:
```typescript
// ❌ Don't do this
const result = await context.dataService.mutate(MUTATION, variables);

// ✅ Do this instead
const response = await fetch('http://localhost:3000/admin-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        query: `mutation { ... }`,
        variables: { ... }
    }),
});
```

### 3. Plugin Compatibility Issues

**Symptoms:** `Plugin "X" is not compatible with this version of Vendure`

**Solution:** Update plugin compatibility version:
```typescript
@VendurePlugin({
    compatibility: '^3.0.0',  // Match your Vendure version
    // ...
})
```

### 4. AdminUI Compilation Issues

**Symptoms:** AdminUI not compiling or buttons not appearing

**Steps to resolve:**
1. Delete compiled admin-ui: `rm -rf admin-ui`
2. Rebuild: `npm run build`
3. Restart server: `npm run dev`
4. Wait for compilation to complete
5. Access AdminUI at `http://localhost:4200/admin`

### 5. Port Configuration Issues

**Current Architecture:**
- **Port 3000**: Vendure API (Shop API + Admin API)
- **Port 4200**: Angular AdminUI dev server (admin panel)
- **Port 3001/5173**: Next.js web app (storefront)
- **Port 1337**: Strapi CMS

**Verification Commands:**
```bash
# Check all active ports
lsof -i | grep LISTEN

# Test specific APIs
curl http://localhost:3000/shop-api    # Should return GraphQL endpoint
curl http://localhost:3000/admin-api   # Should return GraphQL endpoint
curl http://localhost:4200/admin       # Should show AdminUI
```

## Development Workflow

### Adding New AdminUI Extensions

1. Create extension in `ui-extensions/providers.ts`
2. Use absolute URLs for API calls: `http://localhost:3000/admin-api`
3. Delete and rebuild admin-ui: `rm -rf admin-ui && npm run build`
4. Restart server: `npm run dev`
5. Test at `http://localhost:4200/admin`

### Adding New Plugins

1. Create plugin in `src/plugins/`
2. Set compatibility: `compatibility: '^3.0.0'`
3. Add to `vendure-config.ts` plugins array
4. Restart server

### Production Deployment

1. Update CORS origins with production domains
2. Set `IS_DEV = false` for production
3. Remove dev-only CORS origins
4. Use proper SSL certificates for HTTPS
5. Configure cookie settings for production domain

## Useful Commands

```bash
# View server logs
npm run dev

# Check what's running on ports
lsof -i :3000 :3001 :4200 :5173

# Test Shop API
curl -X POST http://localhost:3000/shop-api \
  -H "Content-Type: application/json" \
  -d '{"query":"{ products { items { name } } }"}'

# Test Admin API (requires auth)
curl -X POST http://localhost:3000/admin-api \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"query":"{ administrators { items { emailAddress } } }"}'

# Force rebuild AdminUI
rm -rf admin-ui && npm run build && npm run dev
```

## Environment Variables Checklist

**Web App (.env.local):**
```bash
NEXT_PUBLIC_VENDURE_SHOP_API_URL=http://localhost:3000/shop-api
NEXT_PUBLIC_VENDURE_ADMIN_API_URL=http://localhost:3000/admin-api
```

**API (.env):**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vendure
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=your-password
COOKIE_SECRET=your-secret
```

## Getting Help

1. Check console errors in browser DevTools
2. Check server logs in terminal
3. Verify all services are running on correct ports
4. Test API endpoints directly with curl
5. Check this troubleshooting guide