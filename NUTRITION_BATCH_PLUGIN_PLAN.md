# Nutrition Batch Plugin - Development Plan

## Overview

A Vendure plugin to manage nutrition information, ingredients, and regulatory texts for Product Variants. Each variant can have multiple batches with serving definitions, nutrition tables, and localized content.

## Core Requirements

- **Batch Management**: Multiple batches per Product Variant with one active on website
- **Nutrition Tables**: Structured data with AR/RI percentages
- **Regulatory Texts**: Ingredients, allergens, usage, storage, warnings
- **Internationalization**: Same i18n approach as bundle plugin (LocaleString)
- **Admin UI**: Full Angular UI in Vendure Admin
- **Shop API**: GraphQL access to nutrition data

---

## Phase 1: Foundation & Data Model

**Goal**: Set up plugin structure and define database entities

### Tasks

1. **Plugin Setup**
   - Create plugin directory structure
   - Set up TypeScript configuration
   - Define plugin metadata and dependencies
   - Create barrel exports (index.ts)

2. **Entity: NutritionBatch**
   - Define entity with all core fields:
     - Identity: id, productVariant relation, batchCode
     - Dates: productionDate, expiryDate
     - Active flag: isCurrentForWebsite (with unique constraint per variant)
     - Serving: servingSizeValue, servingSizeUnit, servingLabel, servingsPerContainer
     - Regulatory texts (LocaleString): ingredientsText, allergyAdviceText, recommendedUseText, storageAdviceText, warningsText, shortLabelDescription, referenceIntakeFootnoteText
     - Internal: notesInternal, coaAssetId
   - Set up relations to ProductVariant (ManyToOne)
   - Set up relations to NutritionBatchRow (OneToMany)

3. **Entity: NutritionBatchRow**
   - Define entity with fields:
     - Identity: id, nutritionBatch relation
     - Content: name (LocaleString), group, unit
     - Values: valuePerServing, valuePer100g, referenceIntakePercentPerServing
   - Set up relation to NutritionBatch (ManyToOne)

4. **Database Migrations**
   - Generate initial migration for both entities
   - Test migration up/down

5. **Plugin Registration**
   - Register entities with Vendure
   - Configure plugin options
   - Set up i18n configuration (language files structure)

**Deliverable**: Working plugin foundation with database schema

---

## Phase 2: Business Logic & Services

**Goal**: Implement service layer with business rules

### Tasks

1. **NutritionBatchService**
   - CRUD operations for NutritionBatch
   - `findByVariantId(variantId)`: Get all batches for a variant
   - `getCurrentBatch(variantId)`: Get active website batch
   - `setCurrentBatch(batchId)`: Set active batch (ensures only one active per variant)
   - `createBatch(input)`: Create new batch with validation
   - `updateBatch(id, input)`: Update existing batch
   - `deleteBatch(id)`: Delete batch (with cascading rows)
   - `duplicateBatch(id)`: Clone batch with all rows and texts

2. **NutritionBatchRowService**
   - CRUD operations for NutritionBatchRow
   - `findByBatchId(batchId)`: Get all rows for a batch
   - `createRow(batchId, input)`: Add row to batch
   - `updateRow(id, input)`: Update row
   - `deleteRow(id)`: Remove row
   - `bulkCreateRows(batchId, inputs)`: Add multiple rows
   - `createDefaultMacros(batchId)`: Add default macro rows (Energy, Fat, Carbs, Protein, Salt)

3. **Business Rules**
   - Enforce only one `isCurrentForWebsite = true` per variant
   - Validation for serving size values
   - Unit enum validation
   - Group enum validation

4. **Unit Tests**
   - Service method tests
   - Business rule enforcement tests
   - Edge case handling

**Deliverable**: Complete service layer with business logic

---

## Phase 3: Admin API & Resolvers

**Goal**: Expose GraphQL API for Admin UI

### Tasks

1. **GraphQL Schema (Admin)**
   - Define `NutritionBatch` type
   - Define `NutritionBatchRow` type
   - Define input types:
     - `CreateNutritionBatchInput`
     - `UpdateNutritionBatchInput`
     - `CreateNutritionBatchRowInput`
     - `UpdateNutritionBatchRowInput`
   - Define enums:
     - `ServingSizeUnit` (g, ml, tablet, capsule, scoop, etc.)
     - `NutrientGroup` (macro, vitamin, mineral, amino, other)

2. **Admin Resolvers**
   - Queries:
     - `nutritionBatches(variantId: ID!): [NutritionBatch!]!`
     - `nutritionBatch(id: ID!): NutritionBatch`
     - `currentNutritionBatch(variantId: ID!): NutritionBatch`
   - Mutations:
     - `createNutritionBatch(input: CreateNutritionBatchInput!): NutritionBatch!`
     - `updateNutritionBatch(id: ID!, input: UpdateNutritionBatchInput!): NutritionBatch!`
     - `deleteNutritionBatch(id: ID!): DeletionResponse!`
     - `duplicateNutritionBatch(id: ID!): NutritionBatch!`
     - `setCurrentNutritionBatch(variantId: ID!, batchId: ID!): NutritionBatch!`
     - `createNutritionBatchRow(batchId: ID!, input: CreateNutritionBatchRowInput!): NutritionBatchRow!`
     - `updateNutritionBatchRow(id: ID!, input: UpdateNutritionBatchRowInput!): NutritionBatchRow!`
     - `deleteNutritionBatchRow(id: ID!): DeletionResponse!`
     - `createDefaultMacroRows(batchId: ID!): [NutritionBatchRow!]!`

3. **Permissions**
   - Define permission for nutrition batch management
   - Apply to all mutations
   - Read access for queries

4. **Integration Tests**
   - Test all queries and mutations
   - Test permission enforcement
   - Test validation errors

**Deliverable**: Complete Admin GraphQL API

---

## Phase 4: Admin UI - List & Navigation

**Goal**: Create Angular UI for viewing and navigating batches

### Tasks

1. **i18n Setup**
   - Create language files: `en.json`, `fr.json`
   - Define all translation keys:
     - Tab titles
     - Column headers
     - Button labels
     - Form labels
     - Validation messages
   - Mirror structure from bundle plugin

2. **Variant Tab Extension**
   - Create new tab component: "Batches & Nutrition"
   - Register tab in ProductVariant detail view
   - Route configuration

3. **Batch List Component**
   - Display table with columns:
     - Batch code
     - Production date
     - Expiry date
     - Current for website (checkmark/badge)
     - Actions (Edit, Duplicate)
   - "Add new batch" button
   - Handle empty state

4. **Navigation & Routing**
   - Route to batch editor
   - Breadcrumb navigation
   - Back to variant functionality

5. **UI Polish**
   - Styling consistent with Vendure Admin
   - Loading states
   - Error states

**Deliverable**: Working batch list view in Admin UI

---

## Phase 5: Admin UI - Batch Editor (Part 1: Basic Info)

**Goal**: Create form for batch information and serving details

### Tasks

1. **Batch Editor Component**
   - Create main editor component
   - Load batch data (or initialize for new batch)
   - Save/Cancel buttons
   - Form state management

2. **Batch Info Section**
   - Batch code (text input)
   - Production date (date picker)
   - Expiry date (date picker)
   - "Current batch on website" (checkbox with validation)
   - Internal notes (textarea)
   - COA upload (optional, file picker)

3. **Serving Section**
   - Serving size value (number input)
   - Serving size unit (select dropdown with enum values)
   - Serving label (text input with example)
   - Servings per container (number input, optional)
   - Helper text/examples

4. **Form Validation**
   - Required field validation
   - Number range validation
   - Date validation
   - Current batch uniqueness check

5. **Save Logic**
   - Call GraphQL mutations
   - Handle success/error
   - Navigate back on success
   - Show notifications

**Deliverable**: Working batch editor for basic info and serving

---

## Phase 6: Admin UI - Batch Editor (Part 2: Nutrition Table)

**Goal**: Create editable grid for nutrition table rows

### Tasks

1. **Nutrition Table Component**
   - Editable grid/table component
   - Columns:
     - Name (text input, localized)
     - Group (select dropdown)
     - Unit (text input)
     - Value per serving (number input)
     - Value per 100g (number input)
     - % AR/RI (number input)
   - Row actions (delete button)

2. **Row Management**
   - "Add row" button
   - Delete row with confirmation
   - Drag to reorder rows (optional)
   - Auto-save or batch save

3. **Quick Actions**
   - "Add default macros" button
   - Creates pre-populated rows: Energy (kcal), Energy (kJ), Fat, Carbs, Protein, Salt
   - Customizable default templates

4. **Localization in Grid**
   - Language switcher for row names (if LocaleString)
   - Consistent with bundle plugin UX

5. **Validation**
   - Number validation
   - Unit validation
   - Group validation

**Deliverable**: Working nutrition table editor

---

## Phase 7: Admin UI - Batch Editor (Part 3: Text Blocks)

**Goal**: Create localized text inputs for regulatory content

### Tasks

1. **Text Blocks Component**
   - Reuse locale-aware inputs from bundle plugin
   - Language switcher at section level

2. **Text Fields (All LocaleString)**
   - Ingredients (rich textarea)
   - Allergy advice (rich textarea)
   - Recommended use (textarea)
   - Storage advice (textarea)
   - Warnings (textarea)
   - Short label description (text input)
   - Reference intake footnote (text input)

3. **Rich Text Support**
   - Allow basic formatting for ingredients (bold, italic, lists)
   - HTML sanitization

4. **Character Count/Limits**
   - Display character count for long text fields
   - Optional max length validation

5. **Save & Validation**
   - Integrate with main form save
   - Validate required translations
   - Show missing translation warnings

**Deliverable**: Complete batch editor with all sections

---

## Phase 8: Shop API & GraphQL

**Goal**: Expose nutrition data for frontend consumption

### Tasks

1. **GraphQL Schema (Shop)**
   - Extend `ProductVariant` type:
     - `nutritionBatches: [NutritionBatch!]!`
     - `currentNutritionBatch: NutritionBatch`
   - Define shop-side `NutritionBatch` type
   - Define shop-side `NutritionBatchRow` type
   - Ensure LocaleString fields resolve to current request locale

2. **Shop Resolvers**
   - Add field resolvers to ProductVariant
   - Filter out internal fields (notesInternal, etc.)
   - Apply request context locale for translations

3. **Performance Optimization**
   - Add DataLoader for batch queries
   - Eager load rows with batches
   - Optimize N+1 queries

4. **API Documentation**
   - Document available fields
   - Provide example queries
   - Document locale behavior

5. **Integration Tests**
   - Test shop queries
   - Test locale switching
   - Test missing data scenarios

**Deliverable**: Complete Shop API for nutrition data

---

## Phase 9: Frontend Integration (Next.js)

**Goal**: Display nutrition information on product pages

### Tasks

1. **GraphQL Queries**
   - Add `currentNutritionBatch` to product variant query
   - Include all necessary fields (serving, rows, texts)
   - Handle locale in query

2. **Nutrition Section Component**
   - Create `NutritionSection.tsx` component
   - Conditionally render if nutrition data exists

3. **Nutrition Table Display**
   - Render table with dynamic columns:
     - Show "Per serving" column if any row has valuePerServing
     - Show "Per 100g" column if any row has valuePer100g
     - Show "% AR/RI" column if any row has referenceIntakePercent
   - Group rows by nutrient group (optional styling)
   - Display serving info above table

4. **Regulatory Text Blocks**
   - Ingredients section
   - Allergens section
   - Usage instructions
   - Storage advice
   - Warnings (prominent styling)
   - Short label description
   - Footnote for AR/RI

5. **Styling & UX**
   - Responsive table design
   - Collapsible sections (optional)
   - Print-friendly styles
   - Accessibility (ARIA labels, semantic HTML)

6. **Edge Cases**
   - Handle missing nutrition data
   - Handle empty text fields
   - Handle different unit types

**Deliverable**: Complete frontend nutrition display

---

## Phase 10: Testing & Quality Assurance

**Goal**: Comprehensive testing and bug fixes

### Tasks

1. **Backend Tests**
   - Unit tests for all services (target 80%+ coverage)
   - Integration tests for GraphQL APIs
   - E2E tests for critical flows

2. **Frontend Tests**
   - Component tests for Admin UI
   - Component tests for Shop UI
   - Integration tests with mock API

3. **Manual Testing**
   - Create test variants with nutrition data
   - Test all CRUD operations in Admin
   - Test duplicate functionality
   - Test current batch switching
   - Test multi-language scenarios
   - Test Shop API with different locales
   - Test frontend display in various states

4. **Edge Cases & Bug Fixes**
   - Empty data scenarios
   - Very long text handling
   - Special characters in text
   - Invalid input handling
   - Concurrent updates

5. **Performance Testing**
   - Large nutrition tables
   - Many batches per variant
   - API response times

**Deliverable**: Stable, tested plugin

---

## Phase 11: Documentation & Migration

**Goal**: Complete documentation and deployment readiness

### Tasks

1. **Developer Documentation**
   - README with installation instructions
   - API documentation (GraphQL schema)
   - Configuration options
   - Extension points

2. **User Documentation**
   - Admin user guide
   - How to create/edit batches
   - How to manage nutrition tables
   - Localization guide

3. **Migration Guide**
   - If migrating from custom fields or old system
   - Data migration scripts
   - Rollback procedures

4. **Example Data**
   - Sample nutrition batches
   - Example queries
   - Common patterns

5. **Deployment Checklist**
   - Environment variables
   - Database migration steps
   - Plugin registration
   - Admin UI build

**Deliverable**: Complete documentation and deployment guide

---

## Phase 12: Deployment & Monitoring

**Goal**: Deploy to production and establish monitoring

### Tasks

1. **Staging Deployment**
   - Deploy to staging environment
   - Run migrations
   - Smoke tests
   - User acceptance testing

2. **Production Deployment**
   - Deploy plugin to production
   - Run migrations with backup
   - Verify Admin UI loads
   - Verify Shop API works

3. **Monitoring Setup**
   - Log nutrition batch operations
   - Monitor API performance
   - Track Admin UI usage
   - Error tracking

4. **Training**
   - Train admin users
   - Provide documentation
   - Handle initial questions

5. **Post-Deployment**
   - Monitor for issues
   - Gather user feedback
   - Plan future enhancements

**Deliverable**: Production-ready plugin with monitoring

---

## Technical Stack

- **Backend**: Vendure (NestJS, TypeScript, TypeORM)
- **Admin UI**: Angular, Vendure Admin UI extensions
- **Shop API**: GraphQL
- **Frontend**: Next.js, React
- **i18n**: Vendure LocaleString, JSON language files
- **Database**: PostgreSQL (or existing Vendure DB)

---

## Key Design Decisions

1. **LocaleString for user-facing content**: All regulatory texts and row names use Vendure's LocaleString pattern
2. **Single current batch per variant**: Enforced at service layer with unique constraint
3. **Dynamic table columns**: Frontend determines columns based on data presence
4. **Batch duplication**: Cloning previous batches speeds up data entry
5. **Same i18n as bundle plugin**: Consistent UX and reuse of patterns

---

## Success Criteria

- ✅ Multiple batches per variant with one active
- ✅ Complete nutrition table with AR/RI percentages
- ✅ All regulatory texts localized
- ✅ Full Admin UI for batch management
- ✅ Shop API returns nutrition data
- ✅ Frontend displays nutrition beautifully
- ✅ Same i18n approach as bundle plugin
- ✅ All tests passing
- ✅ Documentation complete

---

## Next Steps

**Start with Phase 1**: Foundation & Data Model

Begin by setting up the plugin structure and defining the database entities.
