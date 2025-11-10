# Bundle Management Dashboard UI Implementation Guide

## Current Status (2025-11-05)

### ✅ Completed
- **Bundle Backend**: 100% functional GraphQL API with CRUD operations, analytics, stock validation
- **Dashboard Extension Configuration**: Properly configured and discovered by Vite
- **Plugin Metadata**: `dashboard: './dashboard/index.tsx'` added to BundlePlugin
- **Extension Files**: Created in `src/plugins/bundle-plugin/dashboard/`
  - `index.tsx`: Extension entry with routes and navigation
  - `BundlesPage.tsx`: React component for bundle management
- **TypeScript Configuration**: Proper tsconfig.json and tsconfig.dashboard.json setup
- **Vite Configuration**: Only vendureDashboardPlugin (no conflicting React plugins)
- **Extension Discovery**: Vite successfully finds "1 dashboard extensions... BundlePlugin (local)"

### ❌ Blocking Issue
**Node.js Version Incompatibility**
- Current Node: v24.11.0
- Required: Node <=22.x.x (per package engine warnings)
- Error: `vite:react-swc` plugin fails to transform `@vendure/dashboard/src/app/main.tsx`
- Impact: Dashboard dev server starts but crashes when accessing the UI

### 🔧 Next Steps
1. Downgrade Node to v22.x.x (project uses Volta to pin Node 22 for Strapi)
2. Reinstall dependencies with compatible Node version
3. Test Dashboard dev server: `npx vite`
4. Access Dashboard at `http://localhost:3000/dashboard`
5. Verify bundle management UI appears under Catalog section

---

## Implementation Summary

---

## Implementation Plan (React Dashboard)

### ✅ Decision: Use React Dashboard for Bundle UI

**Why:**
- React Dashboard is the v3.5+ supported path
- Angular Admin is deprecated (EOL July 2026)
- Avoids Angular API type mismatches
- Better long-term maintenance

**Keep Angular Admin (`compatibilityMode: true`) only for:**
- Existing legacy screens
- Backward compatibility during transition

---

## Step-by-Step Implementation

### 1. Create Dashboard Extension Structure

**Create folder:**
```
/apps/api/ui-extensions/dashboard/bundles/
```

**Files to create:**

#### File: `bundles.extension.ts`
- **Purpose**: Defines Dashboard extension (route + nav item)
- **Declares**:
  - Route: `/bundles` → renders `BundlesPage.tsx`
  - Nav item: "Manage Bundles" under Catalog section with `routerLink: '/bundles'`

**Reference**: [DefineDashboardExtension API](https://docs.vendure.io/reference/admin-ui-api/dashboard-plugin/dashboard-extension/)

#### File: `BundlesPage.tsx`
- **Purpose**: React component for bundle management interface
- **Options**:
  - **Option A (Quick)**: Embed existing `bundle-management.html` in iframe
  - **Option B (Native)**: Build native React page with Dashboard components

**Reference**: [Creating Pages](https://docs.vendure.io/guides/extending-the-admin-ui/creating-pages/)

---

### 2. Extension Registration Template

**What to declare in `bundles.extension.ts`:**

```typescript
// High-level structure (not actual code)
export default {
  routes: [{
    path: '/bundles',
    component: BundlesPage,
    breadcrumb: 'Bundle Management'
  }],
  
  navigation: [{
    section: 'catalog',
    label: 'Manage Bundles',
    icon: 'layers',
    routerLink: '/bundles',  // Must be routerLink, not onClick
    requiresPermission: 'CreateCatalog'
  }]
}
```

**Key Points:**
- Use `routerLink` for nav items (React Dashboard requirement)
- Path `/bundles` will become `/dashboard/bundles` at runtime
- Icon: Use Dashboard icon names
- Permissions: Tie to existing Vendure permissions

**Reference**: [Navigation / Route Definitions](https://docs.vendure.io/guides/extending-the-admin-ui/nav-menu/)

---

### 3. Register Extension with Dashboard Build

**In your Dashboard config (where extensions are gathered):**
- Import `bundles.extension.ts`
- Add to extensions array
- Ensure Dashboard build picks it up

**Reference**: [Extending the Dashboard](https://docs.vendure.io/guides/extending-the-admin-ui/)

---

### 4. Compile & Serve Dashboard

#### Development Mode:
1. Start Vendure API: `npm run dev:server` (port 3000)
2. Start Dashboard dev server (Vite): separate terminal
3. Open: `http://localhost:3000/dashboard`
4. Dashboard dev server will hot-reload

**Reference**: [Getting Started with Dashboard](https://docs.vendure.io/guides/getting-started/dashboard/)

#### Production Mode:
- Compile Dashboard bundle
- Let `DashboardPlugin` serve it
- Similar to Angular Admin compilation but for React

**Reference**: [Deploying Admin UI](https://docs.vendure.io/guides/deployment/deploy-admin-ui/)

---

### 5. Page Content Options

#### Option A: Quick Integration (Iframe)
**Embed existing HTML:**
```tsx
// In BundlesPage.tsx
<iframe 
  src="/assets/bundle-management.html"
  style={{ width: '100%', height: '100vh', border: 'none' }}
/>
```

**Pros:**
- Reuses working `bundle-management.html`
- Fastest to implement
- Gets UI in Dashboard immediately

**Cons:**
- Not "native" Dashboard experience
- Iframe communication overhead

#### Option B: Native React Page
**Build with Dashboard components:**
- Use Dashboard UI component library
- Direct GraphQL integration
- Better UX/performance

**Reference**: [Dashboard UI Components](https://docs.vendure.io/reference/admin-ui-api/react-components/)

---

### 6. Update DashboardPlugin Configuration

**Current config (line 120-123):**
```typescript
DashboardPlugin.init({
    route: 'dashboard',
    appDir: path.join(__dirname, '../ui-extensions'),
})
```

**Keep:**
- `route: 'dashboard'` → serves at `/dashboard`
- `appDir` → points to extensions folder

**Add:**
- Extension registration in Dashboard build process

---

### 7. Route Alignment Checklist

**Ensure consistency:**
- **DashboardPlugin.route**: `'dashboard'` → serves at `/dashboard`
- **Extension path**: `/bundles` → final URL: `/dashboard/bundles`
- **Nav routerLink**: `'/bundles'` (relative to Dashboard base)
- **API endpoint**: `/admin-api` (already working)

**Common Pitfalls:**
- ❌ Mixing Angular Admin routes with Dashboard routes
- ❌ Using `onClick` instead of `routerLink` for nav items
- ❌ Route/baseHref mismatch
- ❌ Trying to add routes to `AdminUiPlugin.compileUiExtensions` for v3.5

**Reference**: [AdminUiPluginOptions](https://docs.vendure.io/reference/core-plugins/admin-ui-plugin/)

---

### 8. Runtime Verification

**Once implemented, verify:**
1. Navigate to: `http://localhost:3000/dashboard`
2. Look for: "Manage Bundles" menu item under Catalog
3. Click it: Should navigate to `/dashboard/bundles`
4. Page loads: Bundle management interface appears
5. Test CRUD: Create/edit/delete bundles via UI

---

## Optional Enhancements (Phase 2)

### Action Bar Items
Add buttons to existing Dashboard pages:

**Example locations:**
- Orders page: "Create bundle from cart"
- Products page: "Add to bundle"

**How:**
- Use Action Bar Items API
- Enable Dev Mode to find `pageId` and location slots
- Register via extension

**Reference**: [Action Bar Items](https://docs.vendure.io/guides/extending-the-admin-ui/action-bar/)

### Detail Forms
Add bundle-specific fields to product detail pages:

**Reference**: [Custom Detail Forms](https://docs.vendure.io/guides/extending-the-admin-ui/custom-detail-components/)

---

## Migration Strategy

### Phase 1: Quick Win (This Implementation)
- ✅ Create Dashboard extension structure
- ✅ Register route + nav item
- ✅ Embed existing HTML via iframe
- ✅ Get UI accessible to shop managers

### Phase 2: Native Experience
- 🔄 Replace iframe with native React page
- 🔄 Use Dashboard component library
- 🔄 Add Action Bar items on relevant pages

### Phase 3: Full Integration
- 🔄 Custom form components
- 🔄 Bulk operations
- 🔄 Bundle analytics dashboard widgets

---

## Why This Fixes Current Errors

### Error 1: Type mismatches in Angular components
**Root cause**: Trying to use deprecated Angular Admin APIs
**Solution**: Use React Dashboard with proper v3.5 APIs

### Error 2: `routerLink` required for nav items
**Root cause**: Dashboard nav requires routes, not `onClick` handlers
**Solution**: Define proper Dashboard route, link nav to it

### Error 3: Component incompatibility
**Root cause**: Mixing Angular and React component patterns
**Solution**: Pure React Dashboard extension

---

## File Locations Summary

### Keep (Don't modify):
- `/apps/api/src/plugins/bundle-plugin/` - Working backend
- `/apps/api/static/assets/bundle-management.html` - Working HTML UI
- `/apps/api/src/vendure-config.ts` - Main config

### Create:
- `/apps/api/ui-extensions/dashboard/bundles/bundles.extension.ts`
- `/apps/api/ui-extensions/dashboard/bundles/BundlesPage.tsx`

### Remove/Clean up:
- `/apps/api/ui-extensions/bundle-routes.ts` - Old Angular attempt
- `/apps/api/ui-extensions/providers.ts` - Remove broken onClick nav item
- `/apps/api/ui-extensions/bundle-*.component.ts` - Old Angular components

---

## Success Criteria

- [ ] Dashboard opens at `/dashboard`
- [ ] "Manage Bundles" appears in Catalog menu
- [ ] Clicking nav item navigates to `/dashboard/bundles`
- [ ] Bundle management UI loads and works
- [ ] Can create new bundles via UI
- [ ] Can edit existing bundles
- [ ] Can delete bundles
- [ ] Changes reflect in GraphQL API
- [ ] No console errors
- [ ] Shop managers can use without technical knowledge

---

## References & Documentation

### Core Docs:
- [Dashboard Plugin](https://docs.vendure.io/reference/core-plugins/dashboard-plugin/)
- [Extending the Dashboard](https://docs.vendure.io/guides/extending-the-admin-ui/)
- [Creating Pages](https://docs.vendure.io/guides/extending-the-admin-ui/creating-pages/)
- [Navigation](https://docs.vendure.io/guides/extending-the-admin-ui/nav-menu/)

### API Reference:
- [DefineDashboardExtension](https://docs.vendure.io/reference/admin-ui-api/dashboard-plugin/dashboard-extension/)
- [React Components](https://docs.vendure.io/reference/admin-ui-api/react-components/)
- [Action Bar Items](https://docs.vendure.io/guides/extending-the-admin-ui/action-bar/)

### Deployment:
- [Getting Started](https://docs.vendure.io/guides/getting-started/dashboard/)
- [Deploying Admin UI](https://docs.vendure.io/guides/deployment/deploy-admin-ui/)

---

## Next Steps

1. **Read**: Dashboard Extension API docs
2. **Create**: Extension files structure
3. **Register**: Extension with Dashboard build
4. **Test**: Dev mode first
5. **Iterate**: Start with iframe, move to native React later
6. **Deploy**: Compile for production

---

## Notes

- **compatibilityMode: true** allows Angular Admin and React Dashboard to coexist
- Keep Angular routes separate (`/admin`) from Dashboard routes (`/dashboard`)
- Dashboard is the future - invest time here, not in Angular Admin
- Bundle backend is production-ready - just needs proper UI integration