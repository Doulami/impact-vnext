# Shop API Guide - Nutrition Batch Plugin

## Overview

The Nutrition Batch Plugin extends the Vendure Shop API to provide nutrition information for products. All localized fields automatically resolve to the request language.

## GraphQL Schema Extensions

### ProductVariant Extension

The `ProductVariant` type is extended with two new fields:

```graphql
extend type ProductVariant {
  nutritionBatches: [NutritionBatch!]!
  currentNutritionBatch: NutritionBatch
}
```

### Types

```graphql
type NutritionBatch {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  productVariant: ProductVariant!
  batchCode: String!
  productionDate: DateTime
  expiryDate: DateTime
  
  # Serving information
  servingSizeValue: Float!
  servingSizeUnit: ServingSizeUnit!
  servingLabel: String!  # ← Localized
  servingsPerContainer: Int
  
  # Regulatory texts (all localized)
  ingredientsText: String
  allergyAdviceText: String
  recommendedUseText: String
  storageAdviceText: String
  warningsText: String
  shortLabelDescription: String
  referenceIntakeFootnoteText: String
  
  # Nutrition table
  rows: [NutritionBatchRow!]!
}

type NutritionBatchRow {
  id: ID!
  name: String!  # ← Localized
  group: NutrientGroup!
  unit: String!
  valuePerServing: Float
  valuePer100g: Float
  referenceIntakePercentPerServing: Float
  displayOrder: Int!
}
```

## Localization

### How It Works

All localized fields are stored as JSON objects in the database:
```json
{
  "en": "60 g (1.5 scoops)",
  "fr": "60 g (1,5 dosettes)"
}
```

When querying the Shop API, these fields automatically resolve to the **request language**:
- If you request with `Accept-Language: fr`, you get French
- If you request with `Accept-Language: en`, you get English
- If the requested language isn't available, it falls back to English
- If English isn't available, it returns the first available language

### Localized Fields

The following fields are automatically localized:

**NutritionBatch:**
- `servingLabel`
- `ingredientsText`
- `allergyAdviceText`
- `recommendedUseText`
- `storageAdviceText`
- `warningsText`
- `shortLabelDescription`
- `referenceIntakeFootnoteText`

**NutritionBatchRow:**
- `name`

## Example Queries

### 1. Get Product with Nutrition Data

```graphql
query GetProductWithNutrition($slug: String!) {
  product(slug: $slug) {
    id
    name
    variants {
      id
      name
      sku
      
      # Nutrition data
      currentNutritionBatch {
        id
        batchCode
        
        # Serving info (localized)
        servingSizeValue
        servingSizeUnit
        servingLabel
        servingsPerContainer
        
        # Regulatory texts (localized)
        ingredientsText
        allergyAdviceText
        recommendedUseText
        storageAdviceText
        warningsText
        shortLabelDescription
        referenceIntakeFootnoteText
        
        # Nutrition table
        rows {
          id
          name          # ← Localized (e.g., "Protein" or "Protéines")
          group
          unit
          valuePerServing
          valuePer100g
          referenceIntakePercentPerServing
          displayOrder
        }
      }
    }
  }
}
```

### 2. Get Only Nutrition Data

```graphql
query GetNutritionBatch($variantId: ID!) {
  currentNutritionBatch(variantId: $variantId) {
    id
    batchCode
    servingSizeValue
    servingSizeUnit
    servingLabel
    
    ingredientsText
    allergyAdviceText
    
    rows {
      name
      unit
      valuePerServing
      valuePer100g
      referenceIntakePercentPerServing
    }
  }
}
```

### 3. Get All Batches for a Variant

```graphql
query GetAllBatches($variantId: ID!) {
  nutritionBatches(variantId: $variantId) {
    id
    batchCode
    productionDate
    expiryDate
    servingLabel
    
    rows {
      name
      valuePerServing
      unit
    }
  }
}
```

## Frontend Integration (Next.js Example)

### 1. GraphQL Query

```typescript
// lib/queries/product.ts
import { gql } from '@apollo/client';

export const GET_PRODUCT_WITH_NUTRITION = gql`
  query GetProductWithNutrition($slug: String!, $languageCode: LanguageCode!) {
    product(slug: $slug) {
      id
      name
      description
      
      variants {
        id
        name
        sku
        price
        
        currentNutritionBatch {
          servingSizeValue
          servingSizeUnit
          servingLabel
          servingsPerContainer
          
          ingredientsText
          allergyAdviceText
          recommendedUseText
          storageAdviceText
          warningsText
          referenceIntakeFootnoteText
          
          rows {
            name
            group
            unit
            valuePerServing
            valuePer100g
            referenceIntakePercentPerServing
            displayOrder
          }
        }
      }
    }
  }
`;
```

### 2. React Component

```tsx
// components/NutritionSection.tsx
import React from 'react';

interface NutritionSectionProps {
  batch: {
    servingSizeValue: number;
    servingSizeUnit: string;
    servingLabel: string;
    servingsPerContainer?: number;
    ingredientsText?: string;
    allergyAdviceText?: string;
    recommendedUseText?: string;
    storageAdviceText?: string;
    warningsText?: string;
    referenceIntakeFootnoteText?: string;
    rows: Array<{
      name: string;
      group: string;
      unit: string;
      valuePerServing?: number;
      valuePer100g?: number;
      referenceIntakePercentPerServing?: number;
      displayOrder: number;
    }>;
  };
}

export function NutritionSection({ batch }: NutritionSectionProps) {
  if (!batch) return null;

  // Sort rows by display order
  const sortedRows = [...batch.rows].sort((a, b) => a.displayOrder - b.displayOrder);
  
  // Check which columns have data
  const hasPerServing = sortedRows.some(row => row.valuePerServing != null);
  const hasPer100g = sortedRows.some(row => row.valuePer100g != null);
  const hasRI = sortedRows.some(row => row.referenceIntakePercentPerServing != null);

  return (
    <div className="nutrition-section">
      <h2>Nutrition Information</h2>
      
      {/* Serving Info */}
      <div className="serving-info">
        <p>
          <strong>Serving Size:</strong> {batch.servingLabel}
        </p>
        {batch.servingsPerContainer && (
          <p>
            <strong>Servings Per Container:</strong> {batch.servingsPerContainer}
          </p>
        )}
      </div>

      {/* Nutrition Table */}
      <table className="nutrition-table">
        <thead>
          <tr>
            <th>Nutrient</th>
            {hasPerServing && <th>Per Serving</th>}
            {hasPer100g && <th>Per 100g</th>}
            {hasRI && <th>% RI*</th>}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map(row => (
            <tr key={row.name}>
              <td>{row.name}</td>
              {hasPerServing && (
                <td>
                  {row.valuePerServing != null 
                    ? `${row.valuePerServing} ${row.unit}` 
                    : '-'}
                </td>
              )}
              {hasPer100g && (
                <td>
                  {row.valuePer100g != null 
                    ? `${row.valuePer100g} ${row.unit}` 
                    : '-'}
                </td>
              )}
              {hasRI && (
                <td>
                  {row.referenceIntakePercentPerServing != null 
                    ? `${row.referenceIntakePercentPerServing}%` 
                    : '-'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footnote */}
      {batch.referenceIntakeFootnoteText && (
        <p className="footnote">{batch.referenceIntakeFootnoteText}</p>
      )}

      {/* Regulatory Texts */}
      <div className="regulatory-texts">
        {batch.ingredientsText && (
          <div className="text-block">
            <h3>Ingredients</h3>
            <p>{batch.ingredientsText}</p>
          </div>
        )}

        {batch.allergyAdviceText && (
          <div className="text-block">
            <h3>Allergen Information</h3>
            <p>{batch.allergyAdviceText}</p>
          </div>
        )}

        {batch.recommendedUseText && (
          <div className="text-block">
            <h3>Recommended Use</h3>
            <p>{batch.recommendedUseText}</p>
          </div>
        )}

        {batch.storageAdviceText && (
          <div className="text-block">
            <h3>Storage</h3>
            <p>{batch.storageAdviceText}</p>
          </div>
        )}

        {batch.warningsText && (
          <div className="text-block warning">
            <h3>Warnings</h3>
            <p>{batch.warningsText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 3. Using the Component

```tsx
// pages/product/[slug].tsx
import { useQuery } from '@apollo/client';
import { GET_PRODUCT_WITH_NUTRITION } from '@/lib/queries/product';
import { NutritionSection } from '@/components/NutritionSection';

export default function ProductPage({ slug }) {
  const { data, loading } = useQuery(GET_PRODUCT_WITH_NUTRITION, {
    variables: { slug },
    context: {
      headers: {
        'Accept-Language': 'fr' // or get from locale context
      }
    }
  });

  if (loading) return <div>Loading...</div>;

  const variant = data?.product?.variants[0];
  const nutrition = variant?.currentNutritionBatch;

  return (
    <div>
      <h1>{data.product.name}</h1>
      <p>{data.product.description}</p>
      
      {/* Other product info */}
      
      {nutrition && <NutritionSection batch={nutrition} />}
    </div>
  );
}
```

## Language Header Examples

### Setting Request Language

**JavaScript/TypeScript (Apollo Client):**
```typescript
const client = new ApolloClient({
  uri: 'http://localhost:3000/shop-api',
  headers: {
    'Accept-Language': 'fr'
  }
});
```

**cURL:**
```bash
curl -X POST http://localhost:3000/shop-api \
  -H "Content-Type: application/json" \
  -H "Accept-Language: fr" \
  -d '{"query": "{ currentNutritionBatch(variantId: \"1\") { servingLabel } }"}'
```

**Fetch:**
```javascript
fetch('http://localhost:3000/shop-api', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': 'fr'
  },
  body: JSON.stringify({
    query: `{
      currentNutritionBatch(variantId: "1") {
        servingLabel
      }
    }`
  })
});
```

## Best Practices

1. **Always query `currentNutritionBatch`** for product pages (not all batches)
2. **Check for null** - not all products have nutrition data
3. **Use display order** - `rows` are sorted by `displayOrder` field
4. **Dynamic columns** - Check if data exists before showing columns
5. **Highlight warnings** - Style `warningsText` prominently
6. **Cache appropriately** - Nutrition data changes infrequently

## Performance

- All nutrition data is eager-loaded with the batch (including rows)
- No N+1 query issues
- Locale resolution happens in-memory (fast)
- Consider caching at CDN level for product pages

## Troubleshooting

**Q: I'm getting null for `currentNutritionBatch`**
- Check if a batch exists for that variant in admin
- Ensure one batch is marked as "current for website"

**Q: Localized fields return wrong language**
- Check `Accept-Language` header in request
- Verify the language exists in the JSON data
- Check fallback behavior (English → first available)

**Q: Table columns are empty**
- Some products may only have per-serving OR per-100g data
- Check if `valuePerServing` / `valuePer100g` is null
- Use conditional rendering based on data presence
