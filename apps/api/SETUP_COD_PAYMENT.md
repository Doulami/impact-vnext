# Setting Up Cash on Delivery (COD) Payment Method

The COD payment handler has been added to the Vendure backend. Follow these steps to activate it in the admin panel.

## Prerequisites

1. Restart the Vendure API server to load the new payment handler:
   ```bash
   cd apps/api
   npm run dev
   ```

2. Access Vendure Admin: http://localhost:3000/admin

## Setup Steps

### 1. Login to Admin Panel
- Username: Your superadmin username (from .env)
- Password: Your superadmin password (from .env)

### 2. Navigate to Payment Methods
- Go to **Settings** (gear icon in sidebar)
- Click on **Payment methods**

### 3. Create COD Payment Method
Click **Create new payment method** and configure:

#### Basic Settings
- **Name**: `Cash on Delivery`
- **Code**: `cash-on-delivery` (must match exactly)
- **Description**: `Pay in cash when your order is delivered`
- **Enabled**: ✓ Check this box

#### Handler Configuration
- **Handler**: Select `cash-on-delivery` from dropdown
  - This is the custom handler we created
  - No additional configuration needed

#### Channel Assignment
- Assign to your sales channel (usually `__default_channel__`)

### 4. Save
Click **Create** to save the payment method

## How It Works

### Customer Flow
1. Customer adds items to cart and proceeds to checkout
2. Enters shipping address
3. Selects shipping method
4. Payment step shows "Cash on Delivery" option
5. Places order - payment is **Authorized** immediately
6. Order code is generated and shown on thank you page

### Admin Flow
1. Order appears in admin with payment status **Authorized**
2. When delivery agent confirms cash collection:
   - Open the order in admin
   - Go to Payments tab
   - Click **Settle payment**
3. Payment status changes to **Settled**

## Payment States

| State | Meaning |
|-------|---------|
| **Authorized** | Order placed, awaiting delivery & cash collection |
| **Settled** | Cash collected from customer |
| **Cancelled** | Order cancelled before delivery |

## Testing

### Test the Checkout Flow
1. Go to http://localhost:3001
2. Add products to cart
3. Proceed to checkout
4. Complete shipping and delivery steps
5. Verify COD payment option is shown
6. Place order
7. Check thank you page shows order code

### Verify in Admin
1. Login to http://localhost:3000/admin
2. Go to **Sales** → **Orders**
3. Find your test order
4. Verify payment status is **Authorized**
5. Click into order → **Payments** tab
6. Click **Settle payment** to simulate cash collection
7. Verify status changes to **Settled**

## Troubleshooting

### Payment method not showing
- Verify handler code is exactly `cash-on-delivery`
- Check payment method is **Enabled**
- Verify it's assigned to the correct channel
- Restart API server

### Payment fails during checkout
- Check API logs for errors
- Verify GraphQL mutation is using `method: 'cash-on-delivery'`
- Ensure handler is registered in `vendure-config.ts`

### Cannot settle payment
- Only payments in **Authorized** state can be settled
- Check admin user has necessary permissions

## Files Modified

- `apps/api/src/payment-handlers/cod-payment-handler.ts` - Handler implementation
- `apps/api/src/vendure-config.ts` - Handler registration
- `apps/web/src/app/checkout/page.tsx` - Frontend integration
- `apps/web/src/app/thank-you/page.tsx` - Thank you page with order details

## Next Steps

For production, you may want to:
- Add minimum order amount validation
- Restrict COD to specific regions/countries
- Add delivery tracking integration
- Send automated SMS to customer on delivery
- Generate cash collection reports for delivery agents
