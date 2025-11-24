Reward Points Plugin Integration Plan (NO NEW PLUGIN)
Clean, Coding-Free, Implementation Roadmap
Goal

Integrate the existing Reward Points functionality directly into the Vendure Admin UI in two key locations:

Customer Detail Page
Add a Customer Points Management section inside
/admin/customer/customers/:id

Global Settings Page
Add a Reward Points Settings section inside
/admin/settings/global-settings

This must be done inside the existing reward-points plugin without creating a new one and without altering existing business logic.

ABSOLUTE RULES

Do NOT create a new plugin.

Do NOT modify or delete the old reward-points logic.

NO schema or database changes.

NO breaking GraphQL changes.

All additions must be purely additive: UI injections + admin settings + optional thin admin resolvers.

Follow the same UI integration pattern as the Batches & Nutrition plugin (as documented in your refactor plan).

PHASE 1 — ANALYSIS
1. Understand the Current Reward Points Plugin

Identify where reward points are stored (entity)

Understand how the plugin calculates:

available points

reserved points

lifetime earned

lifetime redeemed

Confirm where service functions exist for:

earning

redeeming

adjusting

reserving

releasing

Verify how points are linked to customers (usually via customerId).

2. Understand Batches & Nutrition Integration Pattern

It injects UI directly into Product Variant Detail using:

a provider file

a page tab injected at the required location

standalone components

clean GraphQL queries and mutations

It separates UI from backend cleanly.

3. Identify Vendure Integration Points

Customer detail page → location: 'customer-detail'
This is where the new Points Management section must appear.

Global settings → location: 'settings'
You will create a subsection inside the /global-settings page.

PHASE 2 — PLANNING
1. Decide What to Add to the Customer Detail Page

This section must include:

Display of:

Available Points

Reserved Points

Lifetime Earned

Lifetime Redeemed

Pending orders reserving points

Transaction history (optional table)

Management actions:

Adjust points (add/remove)

Add admin note

View full points history

Behavior:

Uses existing backend logic

Wrapper queries/mutations if needed

Does NOT change points logic

2. Decide What to Add to the Global Settings Page

This section must contain configurable Reward Points behavior:

Enable/Disable system

Earn rate (points per currency unit)

Min points to redeem

Max points per order

Allow earning on discounted products

Auto-reserve behavior

Store these in:

Vendure Global Settings, not a new table

Using existing customFields or plugin config (no migrations)

3. Admin GraphQL Requirements

Since this plugin already exists, check what’s already available.

You need:

A query to fetch points for a specific customer

A query to fetch point history

A mutation to adjust points

A query to fetch reward points settings

A mutation to update these settings

Goal:

Reuse existing service logic

Add thin, safe admin-only resolvers if missing

ZERO business logic changes

4. Admin UI Components Needed (high level)

Inside the existing plugin, organize:

A. Providers file

Inject one tab into the customer detail page

Inject one settings section into global-settings page

Follow the same pattern as Batches & Nutrition

B. Customer Points Management UI

Reads point balances

Shows history

Has a modal/form for adjusting points

Uses existing endpoints (or thin wrappers)

C. Reward Points Settings UI

Simple form

Loads settings from global settings

Saves updated settings

PHASE 3 — IMPLEMENTATION STRATEGY
1. Add the UI Extension

Inside the existing plugin:

Add a UI extension config similar to Batches & Nutrition

Register the providers file

Ensure Vendure Admin build picks it up

2. Add the Customer Tab

Inject the “Points” tab into customer-detail

Show rewards balances from GraphQL

Add adjust button

Add history section

3. Add Reward Points Settings Section

Create a settings section inside global settings

Display configurable rewards settings

Save settings to Global Settings

4. Add Thin GraphQL Admin Resolvers if Necessary

These resolvers must:

Call existing reward points service methods

Avoid duplicating business logic

Stay admin-only

Not change old plugin behavior

5. Validate with Sample Customer

Check the tab appears

Check data loads

Adjust points works

Settings load and save correctly

PHASE 4 — TESTING
Test Customer Page Integration

Navigate to /admin/customer/customers/:id

Ensure new tab appears

Points load correctly

Adjust points updates instantly

History loads

Test Settings Page Integration

Navigate to /admin/settings/global-settings

Ensure Reward Points appears

Values load correctly

Saving updates Global Settings

Test Existing Plugin Functionality

Ensure earning/redeeming behavior has NOT changed

Ensure no DB changes

Ensure existing reward plugin still works

Test Order Lifecycle

Place orders

Confirm points reserved

Confirm points released on cancel

Confirm points committed on settlement

PHASE 5 — DEPLOYMENT

Add plugin to Vendure config (UI extension only)

Rebuild Admin UI

Redeploy

No database migrations necessary