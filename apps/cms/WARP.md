# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a Strapi v5.30.0 headless CMS application built with TypeScript. It uses better-sqlite3 as the default database but supports PostgreSQL and MySQL. The project is part of a larger monorepo at `/home/dmiku/dev/impact-vnext/apps/cms`.

## Development Commands

### Development Server
```bash
npm run develop
# or
npm run dev
```
Starts Strapi in development mode with hot reload enabled. The server runs on port 1337 by default.

### Production Build & Start
```bash
npm run build    # Build admin panel for production
npm run start    # Start in production mode (no hot reload)
```

### Strapi CLI Commands
```bash
npm run console  # Open Strapi console for direct database interaction
npm run deploy   # Deploy using Strapi Cloud
npm run strapi   # Direct access to Strapi CLI
```

### Upgrades
```bash
npm run upgrade:dry  # Check what would be upgraded (dry run)
npm run upgrade      # Upgrade to latest Strapi version
```

## Architecture Overview

### Directory Structure
- `src/` - Main application source code
  - `index.ts` - Application entry point with register/bootstrap hooks
  - `api/` - API routes and controllers (currently empty - new collections will be created here)
  - `admin/` - Admin panel customizations
  - `extensions/` - Plugin extensions
- `config/` - Configuration files
  - `database.ts` - Database configuration supporting SQLite, PostgreSQL, MySQL
  - `server.ts` - Server configuration (host, port, app keys)
  - `admin.ts` - Admin panel settings
  - `middlewares.ts` - Custom middleware configuration
  - `plugins.ts` - Plugin configuration
- `database/` - Database files and migrations
- `public/` - Static assets served by Strapi
- `types/` - TypeScript type definitions

### Database Configuration
The application supports multiple databases configured via environment variables:
- **SQLite** (default): Uses `.tmp/data.db`
- **PostgreSQL**: Configure with `DATABASE_URL` or individual connection params
- **MySQL**: Configure with individual connection parameters

### Environment Configuration
Key environment variables (see `.env.example`):
- `HOST`, `PORT` - Server configuration
- `APP_KEYS` - Application security keys (comma-separated array)
- `DATABASE_CLIENT` - Database type (sqlite/postgres/mysql)
- Various JWT and encryption secrets

## Development Notes

### TypeScript Configuration
- Uses CommonJS modules
- Target: ES2019, lib: ES2020
- Strict mode disabled for Strapi compatibility
- Output directory: `dist/`
- Excludes admin files, tests, and plugins from server compilation

### Content Types and APIs
- New content types created via Strapi admin will generate files in `src/api/`
- Each content type gets its own folder with controllers, services, routes, and content-types
- Admin customizations go in `src/admin/`
- Plugin extensions go in `src/extensions/`

### Database Management
- Development uses SQLite by default (stored in `.tmp/data.db`)
- Production should use PostgreSQL or MySQL
- Database schema changes are handled automatically by Strapi's migration system

### Security
- Never commit `.env` file - use `.env.example` as template
- All security tokens and keys should be properly configured in environment variables
- Admin panel requires proper JWT configuration for authentication