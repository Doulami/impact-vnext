# Impact Nutrition E-commerce - Installation Guide

Complete setup guide for the Impact Nutrition monorepo project with Next.js frontend and Strapi CMS backend.

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v18.17.0 or higher, **Node 22** recommended for CMS)
- **npm** (v9.0.0 or higher) 
- **Git**
- **Docker** and **Docker Compose** (optional, for database)
- **Volta** (recommended for Node version management)

### Recommended: Install Volta for Node Version Management

[Volta](https://volta.sh/) automatically manages Node.js versions per project:

```bash
# Install Volta (macOS/Linux)
curl https://get.volta.sh | bash

# Restart your terminal, then install Node 22
volta install node@22
volta install npm@10
```

Check your versions:
```bash
node --version  # Should be v18.17.0+ (v22.x.x recommended)
npm --version   # Should be v9.0.0+ (v10.x.x recommended)
git --version
volta --version # If using Volta
```

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/Doulami/impact-vnext.git
cd impact-vnext
```

### 2. Install Dependencies

#### Install all dependencies across the monorepo:
```bash
# From the root directory
npm install

# Or install each app individually:
cd apps/web && npm install
cd ../cms && npm install
```

### 3. Environment Setup

#### Web Application (.env.local)
```bash
cd apps/web
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:
```env
# GraphQL API Endpoint (Vendure)
NEXT_PUBLIC_GRAPHQL_URL=https://demo.vendure.io/shop-api

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

#### CMS Application (.env)
```bash
cd apps/cms
cp .env.example .env
```

> **Note:** The CMS is configured to use Node.js 22 via Volta. If you have Volta installed, it will automatically switch to the correct Node version when you enter the `apps/cms` directory.

Edit `.env` with your configuration:
```env
# Server Configuration
HOST=0.0.0.0
PORT=1337

# Database (SQLite by default)
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db

# Security Keys (Generate new ones for production)
APP_KEYS=app_key_1,app_key_2,app_key_3,app_key_4
API_TOKEN_SALT=your_api_token_salt
ADMIN_JWT_SECRET=your_admin_jwt_secret
TRANSFER_TOKEN_SALT=your_transfer_token_salt
JWT_SECRET=your_jwt_secret
```

### 4. Start Development Servers

#### Option A: Start All Services
```bash
# From root directory
npm run dev
```

#### Option B: Start Each Service Individually

**Start CMS (Strapi):**
```bash
cd apps/cms  # Volta will auto-switch to Node 22 if installed
npm run dev
# Strapi will be available at http://localhost:1337
```

**Start Web App (Next.js):**
```bash
cd apps/web
npm run dev  
# Web app will be available at http://localhost:3000
```

### 5. Initial CMS Setup

1. Navigate to http://localhost:1337/admin
2. Create your first admin account
3. The CMS will be ready to use

## 🏗️ Project Structure

```
impact-vnext/
├── apps/
│   ├── web/              # Next.js e-commerce frontend
│   │   ├── src/
│   │   │   ├── app/      # App Router pages
│   │   │   ├── components/ # React components  
│   │   │   └── lib/      # Utilities and hooks
│   │   ├── public/       # Static assets
│   │   └── package.json
│   └── cms/              # Strapi CMS backend
│       ├── config/       # Database and server config
│       ├── src/          # API routes and content types
│       └── package.json
├── packages/             # Shared packages
├── docs/                # Documentation  
└── package.json         # Root package.json
```

## 🛠️ Available Scripts

### Root Level Commands
```bash
npm run dev          # Start all development servers
npm run build        # Build all applications 
npm run lint         # Lint all applications
npm run clean        # Clean all build artifacts and dependencies
```

### Web App Commands (apps/web)
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

### CMS Commands (apps/cms)  
```bash
npm run develop      # Start development server with hot reload
npm run start        # Start production server
npm run build        # Build admin panel for production
npm run strapi       # Access Strapi CLI
```

## 🗃️ Database Configuration

### Development (SQLite - Default)
No additional setup required. Database file will be created automatically at `apps/cms/.tmp/data.db`

### Production (PostgreSQL Recommended)
Update `apps/cms/.env`:
```env
DATABASE_CLIENT=postgres
DATABASE_HOST=your-db-host
DATABASE_PORT=5432
DATABASE_NAME=impact_nutrition
DATABASE_USERNAME=your-username
DATABASE_PASSWORD=your-password
DATABASE_SSL=false
```

### Using Docker for Database
```bash
# Start PostgreSQL with Docker
docker run -d \
  --name impact-postgres \
  -e POSTGRES_DB=impact_nutrition \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15
```

## 🎨 Features Included

### E-commerce Frontend (Next.js)
- ✅ **Product Catalog** with search and filtering
- ✅ **Shopping Cart** with persistent storage
- ✅ **Product Detail Pages** with variant selection
- ✅ **Responsive Design** for mobile and desktop
- ✅ **Real-time Cart Updates** with smooth animations
- ✅ **GraphQL Integration** with Vendure commerce platform

### Content Management (Strapi)
- ✅ **Article System** for blog content
- ✅ **Admin Dashboard** for content management
- ✅ **API Generation** for frontend consumption
- ✅ **Media Library** for asset management
- ✅ **User Management** with role-based permissions

## 🔧 Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Kill processes on default ports
lsof -ti:3000 | xargs kill -9  # Next.js
lsof -ti:1337 | xargs kill -9  # Strapi
```

**Permission Errors:**
```bash
# Fix npm permissions (avoid sudo)
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

**Database Issues:**
```bash
# Reset Strapi database (SQLite)
rm apps/cms/.tmp/data.db
cd apps/cms && npm run develop
```

**Clear All Dependencies:**
```bash
# From root
npm run clean
npm install
```

### Build Issues

**Next.js Build Fails:**
```bash
cd apps/web
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

**Strapi Build Fails:**
```bash
cd apps/cms  
rm -rf build
rm -rf node_modules
npm install
npm run build
```

## 🚀 Production Deployment

### Environment Variables for Production

**Web App (.env.production):**
```env
NEXT_PUBLIC_GRAPHQL_URL=https://your-api.domain.com/shop-api
NEXT_PUBLIC_SITE_URL=https://your-site.domain.com
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

**CMS (.env.production):**
```env
NODE_ENV=production
HOST=0.0.0.0
PORT=1337
DATABASE_CLIENT=postgres
DATABASE_URL=your-production-database-url
APP_KEYS=your-production-keys
API_TOKEN_SALT=your-production-salt
ADMIN_JWT_SECRET=your-production-secret
```

### Build Commands for Production
```bash
# Build web app
cd apps/web
npm run build

# Build CMS
cd apps/cms  
npm run build
npm run start
```

## 📚 Additional Resources

- **Next.js Documentation:** https://nextjs.org/docs
- **Strapi Documentation:** https://docs.strapi.io/
- **Vendure GraphQL API:** https://demo.vendure.io/admin-api
- **Tailwind CSS:** https://tailwindcss.com/docs

## 🆘 Getting Help

If you encounter issues:

1. Check this documentation first
2. Look at the troubleshooting section
3. Check the project's GitHub issues
4. Contact the development team

## 📝 Development Workflow

### Making Changes
1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test locally: `npm run dev`
4. Build to ensure no errors: `npm run build`
5. Commit and push: `git add . && git commit -m "Your message"`
6. Create a pull request

### Code Quality
- Run `npm run lint` before committing
- Use meaningful commit messages
- Test on multiple devices/browsers
- Follow existing code patterns

---

**Happy coding! 🚀**