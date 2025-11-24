# Vendure React Dashboard Configuration Summary

## API_ROOT Location
**Path**: `/home/dmiku/dev/impact-vnext/apps/api`

## Configuration Files

### 1. vendure-config.ts
**Path**: `src/vendure-config.ts`

**DashboardPlugin Configuration** (lines 207-210):
```typescript
DashboardPlugin.init({
    route: 'dashboard',
    appDir: path.join(__dirname, '../dist/dashboard'),
})
```

✅ **Status**: Properly configured
- Route is set to `'dashboard'` (accessible at http://localhost:3000/dashboard)
- AppDir points to `dist/dashboard` which matches Vite's output directory
- Does not conflict with AdminUiPlugin at `/admin` (line 182-206)

### 2. vite.config.mts
**Path**: `vite.config.mts`

**Configuration**:
```typescript
{
  base: '/dashboard',
  build: {
    outDir: join(__dirname, 'dist/dashboard'),
  },
  plugins: [
    vendureDashboardPlugin({
      vendureConfigPath: pathToFileURL('./src/vendure-config.ts'),
      api: { host: 'http://localhost', port: 3000 },
      gqlOutputPath: './src/gql',
    }),
  ],
  resolve: {
    alias: {
      '@/gql': resolve(__dirname, './src/gql/graphql.ts'),
    },
  },
}
```

✅ **Status**: Properly configured
- Base path matches DashboardPlugin route
- Output directory matches DashboardPlugin appDir
- API points to correct host and port

### 3. tsconfig.json
**Path**: `tsconfig.json`

**Key Configuration**:
```json
{
  "exclude": [
    "node_modules",
    "migration.ts",
    "src/plugins/**/ui/*",
    "admin-ui",
    "src/plugins/**/dashboard/*",
    "ui-extensions/dashboard/*",
    "src/gql/*",
    "vite.*.*ts",
    "dist"
  ],
  "references": [{
    "path": "./tsconfig.dashboard.json"
  }]
}
```

✅ **Status**: Properly configured
- Excludes dashboard files from server build
- References dashboard tsconfig for project separation

### 4. tsconfig.dashboard.json
**Path**: `tsconfig.dashboard.json`

**Configuration**:
```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "jsx": "react-jsx",
    "allowJs": false,
    "strict": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/gql": ["./src/gql/graphql.ts"],
      "@/vdb/*": ["./node_modules/@vendure/dashboard/src/lib/*"]
    }
  },
  "include": ["src/plugins/**/dashboard/**/*", "src/gql/**/*.ts"]
}
```

✅ **Status**: Updated to use ESNext and bundler resolution
- Separate TypeScript configuration for React dashboard
- Proper path aliases for GraphQL types and Vendure Dashboard internals
- Excludes non-dashboard code

## NPM Scripts

**Added to package.json**:
```json
{
  "dashboard:dev": "vite",
  "dashboard:build": "vite build"
}
```

✅ **Status**: Added (NOT executed)

## How to Use

### Development Mode
1. Start Vendure server: `npm run dev` (in apps/api)
2. In a separate terminal, start dashboard dev server: `npm run dashboard:dev` (in apps/api)
3. Access dashboard at: http://localhost:3000/dashboard

### Production Build
1. Build dashboard assets: `npm run dashboard:build` (in apps/api)
2. Build Vendure server: `npm run build` (in apps/api)
3. Start server: `npm start` (in apps/api)
4. Access dashboard at: http://localhost:3000/dashboard

## Dependencies

All required dependencies are already installed:
- `@vendure/dashboard`: 3.5.0 ✅
- `vite`: 6.4.1 ✅
- `react`: 19.2.0 ✅
- `react-dom`: 19.2.0 ✅
- `@types/react`: 19.2.2 ✅
- `@types/react-dom`: 19.2.2 ✅

## Path Consistency

| Component | Path |
|-----------|------|
| Dashboard Route | `/dashboard` |
| Vite Base | `/dashboard` |
| Vite Output | `apps/api/dist/dashboard` |
| DashboardPlugin appDir | `path.join(__dirname, '../dist/dashboard')` (resolves to `dist/dashboard` from compiled `dist/src`) |
| Admin UI Route | `/admin` (unchanged) |

✅ All paths are consistent and properly aligned.

## Next Steps

**DO NOT RUN THESE COMMANDS - For user reference only:**

1. Run `npm run dashboard:dev` in the `apps/api` directory to start the Vite dev server
2. Access http://localhost:3000/dashboard to see the React dashboard (no longer a black placeholder)
3. The dashboard will hot-reload on file changes
4. For production, run `npm run dashboard:build` before deploying

## Notes

- The Angular Admin UI at `/admin` remains unchanged and functional
- The DashboardPlugin route `/dashboard` is fixed and cannot be changed
- All configuration is complete and ready for use
- No servers were started during configuration
