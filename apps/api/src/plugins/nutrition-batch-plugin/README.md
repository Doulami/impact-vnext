# Nutrition Batch Plugin

A Vendure plugin for managing nutrition information, ingredients, and regulatory texts for Product Variants.

## Overview

This plugin allows you to:
- Manage multiple nutrition batches per product variant
- Define serving sizes with multiple unit types
- Store structured nutrition tables with AR/RI percentages
- Manage localized regulatory texts (ingredients, allergens, usage, warnings)
- Link Certificate of Analysis (COA) documents
- Expose nutrition data via both Admin and Shop APIs

## Features

### Core Functionality

- **Multiple Batches**: Each product variant can have multiple batches (e.g., different production runs)
- **Current Batch**: One batch per variant can be marked as "current for website"
- **Serving Definition**: Define serving size (value + unit) and servings per container
- **Nutrition Table**: Structured rows with values per serving, per 100g, and AR/RI percentages
- **Regulatory Texts**: All localized using Vendure's LocaleString pattern
- **Batch Duplication**: Clone existing batches to speed up data entry

### Internationalization

All user-facing text fields support localization:
- Serving labels
- Nutrient names
- Ingredients
- Allergy advice
- Recommended use
- Storage advice
- Warnings
- Short descriptions
- Reference intake footnotes

## Installation

The plugin is already registered in `vendure-config.ts`. To use it:

1. Run database migrations to create the tables:
   ```bash
   npm run migrate
   ```

2. The plugin will be available in:
   - **Admin API**: Full CRUD operations
   - **Shop API**: Read-only access for storefront

## GraphQL API

### Admin API

#### Queries

```graphql
# Get all batches for a variant (with pagination, sorting, filtering)
nutritionBatches(options: NutritionBatchListOptions, variantId: ID!): NutritionBatchList!

# Get a specific batch
nutritionBatch(id: ID!): NutritionBatch

# Get the current active batch for a variant
currentNutritionBatch(variantId: ID!): NutritionBatch

# Get rows for a batch
nutritionBatchRows(batchId: ID!): [NutritionBatchRow!]!
```

#### Mutations

```graphql
# Create a new batch
createNutritionBatch(input: CreateNutritionBatchInput!): NutritionBatch!

# Update a batch
updateNutritionBatch(id: ID!, input: UpdateNutritionBatchInput!): NutritionBatch!

# Delete a batch
deleteNutritionBatch(id: ID!): DeletionResponse!

# Set a batch as current for website
setCurrentNutritionBatch(batchId: ID!): NutritionBatch!

# Duplicate a batch
duplicateNutritionBatch(id: ID!): NutritionBatch!

# Create a nutrition row
createNutritionBatchRow(batchId: ID!, input: CreateNutritionBatchRowInput!): NutritionBatchRow!

# Update a row
updateNutritionBatchRow(id: ID!, input: UpdateNutritionBatchRowInput!): NutritionBatchRow!

# Delete a row
deleteNutritionBatchRow(id: ID!): DeletionResponse!

# Create default macro rows (Energy, Fat, Carbs, Protein, Salt)
createDefaultMacroRows(batchId: ID!): [NutritionBatchRow!]!
```

### Shop API

```graphql
# Get current nutrition batch for a variant
currentNutritionBatch(variantId: ID!): NutritionBatch

# Get all batches for a variant
nutritionBatches(variantId: ID!): [NutritionBatch!]!

# Extended ProductVariant type
type ProductVariant {
  nutritionBatches: [NutritionBatch!]!
  currentNutritionBatch: NutritionBatch
}
```

## Data Model

### NutritionBatch

- **Identity**: batchCode, productionDate, expiryDate
- **Status**: isCurrentForWebsite (only one per variant)
- **Serving**: servingSizeValue, servingSizeUnit, servingLabel, servingsPerContainer
- **Texts**: ingredientsText, allergyAdviceText, recommendedUseText, storageAdviceText, warningsText, shortLabelDescription, referenceIntakeFootnoteText
- **Internal**: notesInternal, coaAsset

### NutritionBatchRow

- **Content**: name (localized), group, unit
- **Values**: valuePerServing, valuePer100g, referenceIntakePercentPerServing
- **Display**: displayOrder

### Enums

**ServingSizeUnit**: g, ml, tablet, capsule, scoop, sachet, dosette, piece, serving

**NutrientGroup**: macro, vitamin, mineral, amino, other

## Example Usage

### Create a Batch

```graphql
mutation {
  createNutritionBatch(input: {
    productVariantId: "1"
    batchCode: "L2409"
    productionDate: "2024-09-01"
    expiryDate: "2026-09-01"
    isCurrentForWebsite: true
    servingSizeValue: 60
    servingSizeUnit: g
    servingLabel: "60 g (1,5 dosettes)"
    servingsPerContainer: 30
    ingredientsText: "Whey protein isolate, natural flavors..."
  }) {
    id
    batchCode
  }
}
```

### Add Nutrition Rows

```graphql
mutation {
  # Create default macros first
  createDefaultMacroRows(batchId: "1") {
    id
    name
    unit
  }
  
  # Then add specific values or additional nutrients
  createNutritionBatchRow(batchId: "1", input: {
    name: "Vitamin C - L-Ascorbic Acid"
    group: vitamin
    unit: "mg"
    valuePerServing: 320
    valuePer100g: 533
    referenceIntakePercentPerServing: 400
    displayOrder: 10
  }) {
    id
  }
}
```

## Implementation Status

### Phase 2-3: Backend ✅
- ✅ Entities and database schema
- ✅ Service layer with business logic
- ✅ GraphQL API (Admin + Shop)
- ✅ Database migrations

### Phase 4-8: Admin UI ✅
- ✅ Angular components for batch management
- ✅ Batch list view with TypedBaseListComponent
- ✅ Batch editor (basic info, nutrition table, text blocks)
- ✅ LocaleString input components
- ✅ CRUD operations (create, edit, duplicate, delete, set current)

### Phase 9: List View Upgrade ✅
- ✅ Upgraded to vdr-data-table-2 with pagination
- ✅ Server-side sorting by batch code, production/expiry dates
- ✅ Search by batch code filter
- ✅ PaginatedList support in resolver
- ✅ Professional column layout with Actions column

### Next: Shop API Integration
- ⏳ Expose nutrition data in Shop API
- ⏳ Next.js components for nutrition display
- ⏳ Responsive nutrition table for storefront
- ⏳ Regulatory text blocks display

## Development

### Testing

```bash
# Run migrations
npm run migrate

# Test GraphQL API in Admin GraphiQL
# Navigate to http://localhost:3000/admin-api/graphiql
```

### Database Schema

Run migrations to create the following tables:
- `nutrition_batch`: Main batch table
- `nutrition_batch_row`: Nutrition table rows
- Indexes on productVariantId and isCurrentForWebsite

## Notes

- Only one batch per variant can have `isCurrentForWebsite = true` (enforced at service layer)
- All LocaleString fields automatically resolve to the request's language
- Batch duplication creates a copy with "-COPY" suffix and cleared dates
- COA assets are optional and linked via Vendure's Asset system
