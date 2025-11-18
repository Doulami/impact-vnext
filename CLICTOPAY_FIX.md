# ClicToPay Order State Fix

## Issue Identified
The ClicToPay payment was failing because it tried to add payment to an order that wasn't in the "ArrangingPayment" state.

## Root Cause
In Vendure's order workflow, orders must be transitioned to "ArrangingPayment" state before payments can be added. The COD payment flow was doing this correctly, but ClicToPay was not.

## Fix Applied
Updated `/home/hazem/testing/impact-vnext/apps/web/src/lib/hooks/useClicToPayment.ts`:

1. Added import for `TRANSITION_TO_ARRANGING_PAYMENT` mutation
2. Added `transitionToPayment` mutation to the hook
3. Modified `initiatePayment` function to:
   - First transition the order to "ArrangingPayment" state
   - Check if the transition succeeded
   - Only then proceed with payment creation

## Additional Issue Found
The ClicToPay payment method was not being registered because the plugin was not properly configured with `enabled: true` and the required credentials.

## Additional Fix Applied
1. Updated `vendure-config.ts` to properly initialize ClicToPay plugin with:
   - `enabled: true`
   - Proper environment variable mapping
   - Complete configuration object

2. Updated `.env` file to include proper Vendure environment variables:
   - Database connection variables
   - Admin credentials
   - App environment settings

## Additional Issue Found #2
The order state transition was failing because the checkout flow was already transitioning the order to "ArrangingPayment" state, so ClicToPay was trying to transition from "ArrangingPayment" to "ArrangingPayment" which is invalid.

## Additional Fix Applied #2
Updated `useClicToPayment.ts` to:
1. Check the current order state first using `GET_ACTIVE_ORDER_STATE`
2. Only attempt the transition if the order is not already in "ArrangingPayment" state
3. Skip transition if already in correct state

## Next Steps
1. Restart the Vendure server to pick up the new configuration (if not done already)
2. Test the ClicToPay payment method availability
3. Run the checkout flow and attempt a ClicToPay payment - should now work without state transition errors

## Additional Issue Found #3
There was a code mismatch between the payment handler and the admin UI configuration:
- Payment handler was using code: `'clictopay'`
- Admin UI shows code: `'click-to-pay'`
- Frontend was trying to use: `'clictopay'`

## Additional Fix Applied #3 (Updated)
Reverted back to use consistent `'clictopay'` code (without hyphens):
1. Reverted payment handler in `clictopay-payment-handler.ts` to use `code: 'clictopay'`
2. Reverted frontend hook in `useClicToPayment.ts` to use `method: 'clictopay'`
3. The checkout page already uses `'clictopay'` in multiple places

## Next Steps (Final)
1. **Restart the Vendure server** to pick up the payment handler code change
2. **Update the payment method in Vendure Admin UI**:
   - Go to Settings → Payment Methods
   - Edit the "click to pay" method
   - Change the code from `click-to-pay` to `clictopay` (no hyphens)
   - Save changes
3. Test the ClicToPay payment method availability
4. Run the checkout flow and attempt a ClicToPay payment
