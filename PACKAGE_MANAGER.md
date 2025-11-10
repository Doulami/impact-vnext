# Package Manager Reference

## This Project Uses: **npm with workspaces**

**Lock File**: `package-lock.json`  
**Node Version**: 22.x (Volta: 22.21.1)  
**npm Version**: >=10.0.0 (Volta: 10.9.4)

---

## Installation Commands

### Install all dependencies (from root):
```bash
cd /home/dmiku/dev/impact-vnext
npm install
```

### Install specific workspace:
```bash
# From root
npm install --workspace=apps/api
npm install --workspace=apps/web
npm install --workspace=apps/cms

# Or cd into workspace
cd apps/api && npm install
```

---

## Build/Dev Commands

### API (Vendure Backend)
```bash
cd apps/api
npm run dev          # Run dev server (ts-node)
npm run build        # Build with tsc
npm run start        # Run production
```

### Web (Next.js)
```bash
cd apps/web
npm run dev          # Run on port 3001
npm run build
npm run start
```

### CMS (Strapi)
```bash
cd apps/cms
npm run develop      # Dev mode on port 1337
npm run build
npm run start
```

---

## DO NOT USE:
- ❌ `pnpm` - Not configured
- ❌ `yarn` - Not configured
- ❌ `bun` - Not configured

## ALWAYS USE:
- ✅ `npm` - Package manager for this project
- ✅ Install from root for all workspaces
- ✅ Or cd into workspace and use npm there
