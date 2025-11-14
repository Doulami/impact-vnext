# Reward Points Plugin - Analysis & Implementation Plan

**Date**: January 2025  
**Status**: Analysis Complete - Ready for Implementation  
**Pattern Reference**: bundle-plugin architecture

---

## 📋 Requirements Analysis (from RewardPoints.md)

### Prompt 1: Core Plugin Creation
**Requirements:**
- ✅ Create Vendure 3.5 plugin: `RewardPointsPlugin`
- ✅ ON/OFF toggle from Admin UI
- ✅ Earn points based on order total
- ✅ Redeem points during checkout
- ✅ Settings entity (enabled, earn-rate, redeem-rate, min/max rules)
- ✅ Customer reward points entity + reward transactions
- ✅ GraphQL queries/mutations for fetching & redeeming
- ✅ Automatic award after order is settled
- ✅ Order adjustments when points are redeemed
- ✅ Admin UI extension page under "Marketing → Reward Points"
- ✅ Monorepo structure (apps/api + apps/web)

### Prompt 2: Admin UI Extension
**Requirements:**
- ✅ Settings page with toggle ON/OFF
- ✅ Earn rate configuration
- ✅ Redeem rate configuration
- ✅ Min redeem amount
- ✅ GraphQL integration for save/load settings

### Prompt 3: Next.js Storefront Integration
**Requirements:**
- ✅ Customer dashboard page (total points + history)
- ✅ Checkout UI for redeeming points
- ✅ GraphQL client queries/mutations
- ✅ Hide feature when plugin disabled

### Prompt 4: Order Pipeline Integration
**Requirements:**
- ✅ OrderStateTransitionEvent → award points after payment settled
- ✅ Negative price adjustment when redeeming points
- ✅ Prevent redeem when disabled or insufficient points

### Prompt 5: Database Entities & Migrations
**Requirements:**
- ✅ RewardPointSettings entity
- ✅ RewardPoints (customer balance) entity
- ✅ RewardTransaction entity (history)
- ✅ Relations with Customer
- ✅ Clean migrations

### Prompt 6: Final Integration
**Requirements:**
- ✅ Install plugin in Vendure config
- ✅ Bundle Admin UI extension
- ✅ Connect storefront
- ✅ Deployment steps

---

## 🏗️ Architecture Pattern (Following bundle-plugin)

### Directory Structure (To Be Created)
```
apps/api/src/plugins/reward-points-plugin/
├── entities/
│   ├── reward-point-settings.entity.ts      # Global settings
│   ├── customer-reward-points.entity.ts     # Customer balance
│   └── reward-transaction.entity.ts        # Transaction history
├── services/
│   ├── reward-points.service.ts             # Main business logic
│   ├── reward-points-settings.service.ts    # Settings management
│   ├── reward-points-order.service.ts       # Order integration
│   ├── reward-points-event-handlers.service.ts # Event listeners
│   └── reward-points-promotion-setup.service.ts # Auto-create promotion
├── promotions/
│   └── reward-points-discount.action.ts     # Promotion action (like bundle)
├── api/
│   ├── reward-points-admin.resolver.ts      # Admin GraphQL
│   └── reward-points-shop.resolver.ts       # Shop GraphQL
├── ui/                                      # Admin UI extensions
│   ├── reward-points-settings.component.ts
│   ├── reward-points-settings.component.html
│   ├── reward-points.module.ts
│   └── reward-points-ui-extension.ts
├── reward-points.plugin.ts                  # Main plugin file
└── IMPLEMENTATION_PROGRESS.md               # This file
```

### Key Architectural Decisions

1. **Settings Entity Pattern** (Similar to bundle-plugin's Bundle entity)
   - Single global settings record (singleton pattern)
   - `enabled: boolean`
   - `earnRate: number` (points per currency unit, e.g., 1 point per $1)
   - `redeemRate: number` (currency per point, e.g., $0.01 per point)
   - `minRedeemAmount: number` (minimum points to redeem)
   - `maxRedeemPerOrder: number` (maximum points that can be redeemed per order)

2. **Customer Points Entity** (One-to-one with Customer)
   - `customerId: ID` (FK to Customer)
   - `balance: number` (current points balance)
   - `lifetimeEarned: number` (total points ever earned)
   - `lifetimeRedeemed: number` (total points ever redeemed)

3. **Transaction Entity** (Audit trail)
   - `customerId: ID` (FK to Customer)
   - `orderId?: ID` (FK to Order, nullable)
   - `type: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTED'`
   - `points: number` (positive for earned, negative for redeemed)
   - `orderTotal?: number` (order total when earned)
   - `description: string`
   - `metadata?: JSON`

4. **Order Integration** (Similar to bundle-plugin's order service)
   - Custom fields on Order: `pointsRedeemed`, `pointsEarned`
   - Custom fields on Payment: track if settled
   - Event handler: `OrderStateTransitionEvent` → check if payment settled → award points
   - Price adjustment: negative order line when redeeming

5. **GraphQL Schema** (Following bundle-plugin pattern)
   - Admin API: Settings CRUD, **view/edit all customers' reward points**, transaction history, customer points management
   - Shop API: Get customer points, get transaction history, redeem points mutation

6. **Promotion System Integration** (Following bundle-plugin pattern)
   - Create `RewardPointsDiscountAction` (PromotionItemAction) to apply points redemption discount
   - Create `RewardPointsPromotionSetupService` to auto-create "System Reward Points Discount" promotion on plugin init
   - Store points redemption amount in OrderLine customFields
   - Promotion action reads customFields and applies discount via Vendure promotion system
   - Registered in plugin configuration's `promotionOptions.promotionActions`

---

## 🔄 Implementation Phases

### Phase 1: Database Entities & Core Plugin ✅ PENDING
**Estimated Time**: 2-3 hours

**Tasks:**
1. Create `RewardPointSettings` entity
   - enabled, earnRate, redeemRate, minRedeemAmount, maxRedeemPerOrder
   - Singleton pattern (single record with ID=1)

2. Create `CustomerRewardPoints` entity
   - customerId (one-to-one with Customer)
   - balance, lifetimeEarned, lifetimeRedeemed

3. Create `RewardTransaction` entity
   - customerId, orderId, type, points, orderTotal, description, metadata
   - Timestamps (createdAt, updatedAt)

4. Create migrations for all entities

5. Create main `RewardPointsPlugin` file
   - Register entities
   - Register services
   - Register GraphQL schema (placeholders)

**Files to Create:**
- `entities/reward-point-settings.entity.ts`
- `entities/customer-reward-points.entity.ts`
- `entities/reward-transaction.entity.ts`
- `reward-points.plugin.ts`

**Files to Reference:**
- `bundle-plugin/entities/bundle.entity.ts` (pattern)
- `bundle-plugin/bundle.plugin.ts` (plugin structure)

---

### Phase 2: Core Services ✅ PENDING
**Estimated Time**: 3-4 hours

**Tasks:**
1. Create `RewardPointsSettingsService`
   - `getSettings(ctx)` - get or create default settings
   - `updateSettings(ctx, input)` - update settings
   - Singleton pattern enforcement

2. Create `RewardPointsService`
   - `getCustomerBalance(ctx, customerId)` - get current balance
   - `awardPoints(ctx, customerId, points, orderId, description)` - award points
   - `redeemPoints(ctx, customerId, points, orderId)` - redeem points (with validation)
   - `getTransactionHistory(ctx, customerId, options)` - paginated history
   - `calculatePointsToEarn(orderTotal, earnRate)` - utility
   - `calculateRedeemValue(points, redeemRate)` - utility

3. Create `RewardPointsOrderService`
   - `addPointsAdjustmentToOrder(ctx, order, pointsToRedeem)` - add negative line item
   - `validateRedeemRequest(ctx, customerId, pointsToRedeem)` - check balance, settings
   - Integration with order mutations

**Files to Create:**
- `services/reward-points-settings.service.ts`
- `services/reward-points.service.ts`
- `services/reward-points-order.service.ts`

**Files to Reference:**
- `bundle-plugin/services/bundle.service.ts` (service pattern)
- `bundle-plugin/services/bundle-order.service.ts` (order integration)

---

### Phase 3: GraphQL API ✅ PENDING
**Estimated Time**: 2-3 hours

**Tasks:**
1. Define GraphQL schema in plugin
   - Settings type
   - CustomerRewardPoints type
   - RewardTransaction type
   - Queries: getSettings, getCustomerPoints, getTransactionHistory
   - Mutations: updateSettings, redeemPoints (shop), adjustCustomerPoints (admin)

2. Create Admin Resolver
   - Settings CRUD
   - **View all customers' reward points** (query with pagination/filters)
   - **Edit any customer's reward points** (adjust balance, add/remove points)
   - Customer points management
   - Transaction history queries (all customers or specific customer)

3. Create Shop Resolver
   - Get current customer points
   - Get transaction history
   - Redeem points mutation (with validation)

**Files to Create:**
- `api/reward-points-admin.resolver.ts`
- `api/reward-points-shop.resolver.ts`

**Files to Reference:**
- `bundle-plugin/api/bundle-admin.resolver.ts`
- `bundle-plugin/api/bundle-v3.resolver.ts`

---

### Phase 4: Order Pipeline Integration & Promotion System ✅ PENDING
**Estimated Time**: 3-4 hours

**Tasks:**
1. Create promotion action
   - Create `RewardPointsDiscountAction` (PromotionItemAction)
   - Read `pointsRedeemValue` from OrderLine customFields
   - Apply discount via Vendure promotion system
   - Similar to bundle-plugin's `applyBundleLineAdjustments`

2. Create promotion setup service
   - Create `RewardPointsPromotionSetupService` (OnModuleInit)
   - Auto-create "System Reward Points Discount" promotion on plugin init
   - Use minimum order value condition (always passes)
   - Register promotion action
   - Similar to bundle-plugin's `BundlePromotionSetupService`

3. Create event handler service
   - Listen to `OrderStateTransitionEvent`
   - Check if order is in "PaymentSettled" state
   - Award points based on order total (excluding redeemed points discount)
   - Create transaction record

4. Create order custom fields
   - `pointsRedeemed: int` (points redeemed in this order)
   - `pointsEarned: int` (points earned from this order)
   - `pointsRedeemValue: int` (discount value in cents, stored on OrderLine)

5. Integrate redeem into order mutations
   - Hook into order mutations or create custom mutation
   - Store points redemption amount in OrderLine customFields
   - Promotion action will automatically apply discount
   - Validate before applying

**Files to Create:**
- `promotions/reward-points-discount.action.ts`
- `services/reward-points-promotion-setup.service.ts`
- `services/reward-points-event-handlers.service.ts`

**Files to Modify:**
- `reward-points.plugin.ts` (add event subscribers, register promotion action, add promotion setup service)
- Order/OrderLine custom fields in plugin configuration

**Files to Reference:**
- `bundle-plugin/promotions/bundle-line-adjustment.action.ts`
- `bundle-plugin/services/bundle-promotion-setup.service.ts`
- `bundle-plugin/services/bundle-event-handlers.service.ts`

---

### Phase 5: Admin UI Extension ✅ PENDING
**Estimated Time**: 3-4 hours

**Tasks:**
1. Create settings component
   - Toggle enabled/disabled
   - Input fields: earnRate, redeemRate, minRedeemAmount, **maxRedeemPerOrder**
   - Save button with GraphQL mutation
   - Load settings on init

2. Create customer points management component (Admin)
   - **View all customers' reward points** (table with search/filter)
   - **Edit customer balance** (add/subtract points, set balance)
   - View customer transaction history
   - Link to customer detail page

3. Create module and routing
   - Add to "Marketing" section in Admin UI
   - Route: `/marketing/reward-points`

4. Add translations
   - English and French (if needed)

**Files to Create:**
- `ui/reward-points-settings.component.ts`
- `ui/reward-points-settings.component.html`
- `ui/reward-points-settings.component.scss`
- `ui/reward-points.module.ts`
- `ui/reward-points-ui-extension.ts`

**Files to Reference:**
- `bundle-plugin/ui/bundle-detail.component.ts`
- `bundle-plugin/ui/bundle-ui-extension.ts`

---

### Phase 6: Next.js Storefront Integration ✅ PENDING
**Estimated Time**: 3-4 hours

**Tasks:**
1. Create customer dashboard page
   - Display current balance
   - Show transaction history table
   - Route: `/account/reward-points`

2. Create checkout redemption UI
   - Toggle to use points
   - Input for points to redeem (with max validation)
   - Display discount amount preview
   - GraphQL mutation to apply redemption

3. Create GraphQL queries/mutations (client-side)
   - `GET_CUSTOMER_POINTS` query
   - `GET_REWARD_TRANSACTIONS` query
   - `REDEEM_POINTS` mutation
   - Conditional rendering based on settings.enabled

**Files to Create/Modify:**
- `apps/web/src/app/account/reward-points/page.tsx`
- `apps/web/src/components/checkout/RewardPointsRedeem.tsx`
- `apps/web/src/lib/graphql/queries.ts` (add reward points queries)

**Files to Reference:**
- `bundle-plugin/` (storefront patterns if any)

---

### Phase 7: Testing & Polish ✅ PENDING
**Estimated Time**: 2-3 hours

**Tasks:**
1. Unit tests for services
2. Integration tests for order flow
3. End-to-end testing
4. Error handling improvements
5. Documentation

---

## 📊 Progress Tracking

| Phase | Status | Completion | Notes |
|-------|--------|------------|-------|
| Phase 1: Entities & Plugin | ⏳ Pending | 0% | Ready to start |
| Phase 2: Core Services | ⏳ Pending | 0% | Blocked by Phase 1 |
| Phase 3: GraphQL API | ⏳ Pending | 0% | Blocked by Phase 2 |
| Phase 4: Order Integration | ⏳ Pending | 0% | Blocked by Phase 2 |
| Phase 5: Admin UI | ⏳ Pending | 0% | Blocked by Phase 3 |
| Phase 6: Storefront | ⏳ Pending | 0% | Blocked by Phase 3 |
| Phase 7: Testing | ⏳ Pending | 0% | Final phase |

**Overall**: 0% Complete (0/7 phases)

---

## 🔑 Key Design Patterns (From bundle-plugin)

### 1. **Entity Pattern**
- Use `@Entity()` decorator with TypeORM
- Extend `VendureEntity` for automatic ID, timestamps
- Use proper relations (`@OneToOne`, `@ManyToOne`, etc.)
- Reference: `bundle-plugin/entities/bundle.entity.ts`

### 2. **Service Pattern**
- Injectable services with `@Injectable()`
- Use `RequestContext` for all operations
- Use `TransactionalConnection` for database operations
- Business logic separated from resolvers
- Reference: `bundle-plugin/services/bundle.service.ts`

### 3. **Resolver Pattern**
- Separate Admin and Shop resolvers
- Use `@Resolver()` decorator
- Use `@Query()` and `@Mutation()` decorators
- Proper error handling with try/catch
- Reference: `bundle-plugin/api/bundle-v3.resolver.ts`

### 4. **Plugin Configuration**
- Use `@VendurePlugin()` decorator
- Register entities in `entities: []`
- Register services in `providers: []`
- Define GraphQL schema in `adminApiExtensions` and `shopApiExtensions`
- Use `configuration` function for custom fields
- **Register promotion action in `promotionOptions.promotionActions`**
- Reference: `bundle-plugin/bundle.plugin.ts`

### 4b. **Promotion Integration Pattern**
- Create `PromotionItemAction` that reads OrderLine customFields
- Store redemption discount amount in OrderLine customFields (`pointsRedeemValue`)
- Promotion action applies discount when promotion system evaluates
- Auto-create system promotion on plugin init via `OnModuleInit`
- Reference: `bundle-plugin/promotions/bundle-line-adjustment.action.ts`
- Reference: `bundle-plugin/services/bundle-promotion-setup.service.ts`

### 5. **Event Handlers**
- Subscribe to Vendure events
- Use `@OnVendureBootstrap()` for initialization
- Listen to order state transitions
- Reference: `bundle-plugin/services/bundle-event-handlers.service.ts`

### 6. **Progress Tracking**
- Keep detailed progress file (this file)
- Document what was implemented
- Track file modifications
- Reference: `bundle-plugin/IMPLEMENTATION_PROGRESS.md`

---

## ⚠️ Important Considerations

1. **Points Calculation**
   - Points earned = Order total (excluding points discount) × earnRate
   - Redeem value = Points × redeemRate
   - Rounding: Store as integers (e.g., 1 point = 100 "sub-points" or use cents)

2. **Validation**
   - Check if plugin is enabled before any operation
   - Check customer has sufficient balance before redeeming
   - Enforce min redeem limit (`minRedeemAmount`)
   - Enforce max redeem limit (`maxRedeemPerOrder`)
   - Validate settings values (positive numbers, etc.)

3. **Order State**
   - Award points only after payment is settled (not just paid)
   - Handle refunds/cancellations (may need to reverse points)

4. **Transaction History**
   - Always create transaction records for audit trail
   - Include order reference when applicable
   - Store metadata for debugging

5. **Performance**
   - Index customerId on transaction table
   - Consider caching customer balance (with invalidation on transactions)
   - Paginate transaction history

6. **Security**
   - Shop API: Only allow customers to see/modify their own points
   - Admin API: Require permissions for settings/customer management
   - **Admin can view and edit all customers' reward points** (with proper permissions)
   - Validate all inputs

---

## 📝 Next Steps

1. ✅ **Analysis Complete** - This document
2. ⏳ **Start Phase 1** - Create entities and plugin structure
3. ⏳ **Continue with Phase 2-7** - Follow implementation plan

---

**Status**: Ready to begin implementation following bundle-plugin patterns! 🚀

