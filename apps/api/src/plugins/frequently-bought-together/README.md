# Frequently Bought Together Plugin

## Overview
Analyzes order history to generate intelligent product recommendations based on purchasing patterns. Uses pre-calculated associations with multi-factor scoring.

## Features
- **Smart Scoring**: Combines frequency, recency, and value metrics
- **Multiple Display Contexts**: PDP (related section + under add-to-cart), cart, checkout
- **Bundle Integration**: Automatically excludes bundle products from calculations
- **Scheduled Calculation**: Background job processes order history
- **Configurable**: Admin UI for all settings
- **Performance Optimized**: Pre-calculated associations with database indexes

## Architecture

### Entities
- **ProductAssociation**: Stores calculated product pairs with scores
- **AssociationSettings**: Plugin configuration (singleton)

### Services
- **AssociationSettingsService**: CRUD for settings
- **AssociationCalculationService**: Core scoring algorithm
- **RecommendationService**: Query and format recommendations

### Scheduled Tasks
- **calculate-associations.task**: Analyzes orders and generates associations

### API
- **Admin API**: Settings management, manual triggers, analytics
- **Shop API**: Product and cart recommendations

## Scoring Algorithm

### Multi-Factor Scoring
Each association is scored using three factors:

1. **Frequency Score** (default weight: 0.5)
   - Normalized co-occurrence frequency
   - `freq_conf = cooccurrence_count / total_orders_with_source`

2. **Recency Score** (default weight: 0.3)
   - Time-weighted with exponential decay
   - Recent orders have more influence

3. **Value Score** (default weight: 0.2)
   - Normalized average cart value
   - Higher-value carts weighted more

### Lift Metric
Optional metric to filter out random associations:
- `lift = confidence / support`
- Only keep associations where lift > 1.0

### Final Score
```typescript
final_score = 0.5 * frequency + 0.3 * recency + 0.2 * value
```

## Bundle Plugin Integration

### Exclusion Rules
1. **During Calculation**: Skip products with `customFields.isBundle = true`
2. **In Recommendations**: Filter out bundle products from results
3. **In Cart**: Exclude bundle component variants (`customFields.bundleId != null`)

### Priority
- If product is a bundle → show NO associations (bundle is pre-configured)
- If recommended product is a bundle → show bundle entity instead

## Configuration

### Default Settings
```typescript
{
  enabled: false,
  jobSchedule: '0 2 * * *',        // Daily at 2am
  analysisTimeWindowDays: 90,
  minCooccurrenceThreshold: 5,
  minScoreThreshold: 0.3,
  maxRecommendationsPerProduct: 4,
  frequencyWeight: 0.5,
  recencyWeight: 0.3,
  valueWeight: 0.2,
  displayLocations: {
    pdpRelatedSection: true,
    pdpUnderAddToCart: true,
    cartPage: true,
    checkoutPage: false
  },
  fallbackToRelatedProducts: true
}
```

### Admin UI Location
Dashboard → Settings → Frequently Bought Together

## Usage

### Shop API Queries

#### Get Recommendations for Product
```graphql
query {
  frequentlyBoughtTogether(
    productId: "123"
    context: PDP_RELATED
  ) {
    productId
    score
    reason
  }
}
```

#### Get Cart Recommendations
```graphql
query {
  cartRecommendations(productIds: ["123", "456"]) {
    productId
    score
    reason
  }
}
```

### Admin API

#### Get Settings
```graphql
query {
  associationSettings {
    enabled
    jobSchedule
    analysisTimeWindowDays
    # ... all fields
  }
}
```

#### Update Settings
```graphql
mutation {
  updateAssociationSettings(input: {
    enabled: true
    analysisTimeWindowDays: 60
  }) {
    enabled
    lastCalculation
  }
}
```

#### Trigger Manual Calculation
```graphql
mutation {
  triggerAssociationCalculation {
    jobId
    status
  }
}
```

## Performance Notes

### Database Indexes
- Composite index on `(sourceProductId, channelId)`
- Composite index on `(targetProductId, channelId)`

### Optimization Strategies
- Batch process orders (1000 at a time)
- Use raw SQL for co-occurrence matrix
- Bulk insert/delete operations
- Cache settings to avoid repeated queries

### Recommended Schedule
- Small stores (<10k orders): Daily
- Medium stores (10k-100k): Every 2-3 days
- Large stores (>100k): Weekly

## Terminology

To avoid confusion with Bundle plugin:
- ✅ Use: Association, Recommendation, Frequently Bought Together
- ❌ Avoid: Bundle, Package, Combo, Kit

## Future Enhancements
- Multi-channel support
- ML-based scoring
- A/B testing framework
- "Convert to bundle" cart button
- Product-level manual exclusions
- Analytics dashboard with charts
