Prompt 1 — Create Reward Points Plugin

**“Create a Vendure 3.5 plugin named RewardPointsPlugin that implements a reward points system similar to SUMO Reward Points.
The plugin must include:

A toggle ON/OFF setting from the Vendure Admin UI.

Earn points based on order total.

Redeem points during checkout.

A settings entity storing: enabled/disabled, earn-rate, redeem-rate, min/max rules.

Customer reward points entity + reward transactions.

GraphQL queries/mutations for fetching & redeeming points.

Automatic award of points after an order is settled.

Order adjustments when points are redeemed.

Full Admin UI extension page under “Marketing → Reward Points”.

Plugin should work in a monorepo structure (apps/api + apps/web).
Generate clean, production-ready code.”***

Prompt 2 — Generate Admin UI Extension

**“Generate a Vendure Admin UI extension for the RewardPointsPlugin.
The extension should include a full settings page with:

Toggle ON/OFF for the feature

Earn rate

Redeem rate

Min redeem amount
Add GraphQL integration to save and load settings.”**

Prompt 3 — Generate Next.js Storefront Integration

**“Generate the Next.js storefront features for RewardPointsPlugin:

A customer dashboard page to show total points and history.

Checkout UI where the customer can redeem points.

GraphQL client queries/mutations to fetch and redeem points.
The UI must hide the reward points feature when the plugin is disabled in the admin settings.”**

Prompt 4 — Generate Order Pipeline Integration

**“Generate order pipeline logic for RewardPointsPlugin:

On OrderStateTransitionEvent → award points after payment is settled

Add negative price adjustment when redeeming points

Prevent redeem when plugin disabled or customer has insufficient points.”**

Prompt 5 — Generate Database Entities & Migrations

**“Generate all database entities and migrations needed by RewardPointsPlugin:

RewardPoints entity

RewardTransactions entity

RewardPointSettings entity
Ensure relations with Customer, and create clean migrations.”**

Prompt 6 — Final Integration

“Generate instructions and code to install the RewardPointsPlugin in Vendure config, bundle the Admin UI extension, and connect the storefront. Provide clean deployment steps.”