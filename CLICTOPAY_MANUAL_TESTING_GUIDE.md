# 🧪 ClicToPay Plugin Manual Testing Guide

This guide provides step-by-step instructions for manually testing the ClicToPay payment gateway plugin.

## 📋 Pre-Testing Checklist

- [x] ClicToPay plugin integrated into Vendure config
- [x] Environment variables configured
- [x] Test scripts created
- [ ] Vendure server running
- [ ] Database accessible
- [ ] ClicToPay sandbox credentials (when available)

## 🚀 Step 1: Start Vendure Server

```bash
cd /home/hazem/testing/impact-vnext

# Start the development server
npm run dev

# Expected output:
# - Vendure server starting on port 3000
# - Admin UI available on port 3002
# - No compilation errors
# - ClicToPay plugin loaded successfully
```

**✅ Success Indicators:**
- Server starts without errors
- You see "ClicToPay plugin loaded" in console
- Admin UI accessible at `http://localhost:3002`

## 🔧 Step 2: Verify Plugin Installation

### 2.1 Check Server Logs
Look for these log messages during startup:
```
[Vendure Server] ClicToPayPlugin loading...
[Vendure Server] ClicToPay services registered
[Vendure Server] ClicToPay webhook endpoint: /clictopay/webhook
```

### 2.2 Test Plugin Endpoints

```bash
# Test API connectivity
cd /home/hazem/testing/impact-vnext/apps/api/src/plugins/clictopay-plugin
node test-api-integration.js

# Expected output:
# 🧪 ClicToPay API Integration Test
# ✅ URL building works
# ✅ Webhook signature generation works
# ❌ API connectivity (expected to fail with test credentials)
```

### 2.3 Test Health Check (if available)

```bash
curl http://localhost:3000/health
# or
curl http://localhost:3000/clictopay/health
```

## 🏪 Step 3: Configure Payment Method in Admin UI

1. **Open Admin UI**: `http://localhost:3002`

2. **Login** with superadmin credentials:
   - Username: From `SUPERADMIN_USERNAME` env var
   - Password: From `SUPERADMIN_PASSWORD` env var

3. **Navigate to Payment Methods**:
   - Go to Settings → Payment Methods
   - Click "Create new payment method"

4. **Configure ClicToPay**:
   ```
   Handler: ClicToPay
   Name: ClicToPay
   Description: Pay with ClicToPay
   Enabled: ✅ Yes
   
   Configuration:
   - enabled: true
   - testMode: true  
   - title: ClicToPay
   - description: Secure payment with ClicToPay
   - username: test_merchant_user
   - password: test_merchant_pass
   - webhookSecret: clictopay_webhook_secret_123
   - timeout: 30000
   - retryAttempts: 3
   ```

5. **Save Configuration**

**✅ Success Indicators:**
- Payment method saves without errors
- ClicToPay appears in payment methods list
- Configuration fields are properly validated

## 🧪 Step 4: Test Webhook Endpoint

```bash
cd /home/hazem/testing/impact-vnext/apps/api/src/plugins/clictopay-plugin

# Test webhook endpoint
node test-webhook.js

# Expected output:
# 🚀 ClicToPay Webhook Test Suite
# ✅ Vendure server is running
# 🧪 Testing: Successful Payment Webhook
# ✅ Response Status: 200
# 🧪 Testing: Failed Payment Webhook  
# 🧪 Testing: Invalid Signature (Security Test)
# ✅ Security Test Passed: Invalid signature rejected
```

**✅ Success Indicators:**
- Webhook endpoint responds to POST requests
- Valid signatures are accepted
- Invalid signatures are rejected (401 status)
- Malformed JSON is rejected (400 status)

## 🛒 Step 5: Test Frontend Payment Flow

### 5.1 Access Shop Frontend
- Open shop frontend (usually `http://localhost:3001` or `http://localhost:3000`)
- Navigate to a product and add to cart

### 5.2 Test Checkout Flow
1. **Go to Checkout**
2. **Fill Customer Information**
3. **Select Payment Method**: ClicToPay should appear as an option
4. **Attempt Payment**: Click "Pay with ClicToPay"

**Expected Behavior:**
- Payment method selection shows ClicToPay
- Clicking payment button triggers API call
- Order state changes to "PaymentAuthorized"
- Redirect URL is generated (even if ClicToPay API fails)

### 5.3 Test Error Handling

With test credentials, the payment will likely fail. This is expected and allows you to test error handling:

```
Expected error: "Network Error" or "Invalid credentials"
Order should remain in "ArrangingPayment" state
User should see appropriate error message
```

## 🔍 Step 6: Database Verification

### 6.1 Check Order Creation

```sql
-- Connect to your PostgreSQL database
psql -h localhost -U impact_user -d vendure_impact

-- Check recent orders
SELECT 
  id, code, state, total_with_tax as total, 
  created_at, updated_at
FROM order_entity 
ORDER BY created_at DESC 
LIMIT 5;

-- Check payment attempts
SELECT 
  p.id, p.method, p.state, p.amount,
  p.metadata, o.code as order_code
FROM payment p
JOIN order_entity o ON p.order_id = o.id
WHERE p.method = 'clictopay'
ORDER BY p.created_at DESC;
```

**✅ Success Indicators:**
- Orders are created with correct totals
- Payment records exist with method="clictopay"
- Order states transition properly
- Metadata contains ClicToPay-specific fields

### 6.2 Check Plugin Configuration

```sql
-- Check if ClicToPay payment method exists
SELECT id, code, name, description, enabled
FROM payment_method 
WHERE handler = 'ClicToPay';
```

## 🎯 Step 7: Manual Webhook Testing

### 7.1 Simulate Successful Payment

```bash
# Test successful payment webhook
curl -X POST http://localhost:3000/clictopay/webhook \
  -H "Content-Type: application/json" \
  -H "x-clictopay-signature: t=$(date +%s),v1=$(echo -n "$(date +%s).{\"orderId\":\"CLICTO-123\",\"status\":\"PAID\"}" | openssl dgst -sha256 -hmac "clictopay_webhook_secret_123" -binary | base64)" \
  -d '{
    "orderId": "CLICTO-123456",
    "orderNumber": "ORD-123",
    "status": "PAID",
    "amount": 10000,
    "currency": "EUR",
    "authRefNum": "AUTH123456"
  }'
```

### 7.2 Monitor Webhook Responses

Watch Vendure console for webhook processing logs:
```
[ClicToPay] Webhook received for order ORD-123
[ClicToPay] Payment status: PAID
[ClicToPay] Order state updated to PaymentSettled
```

## 📊 Step 8: Monitor and Debug

### 8.1 Enable Debug Logging

In your `.env` file, add:
```env
LOG_LEVEL=debug
```

Restart Vendure and look for detailed ClicToPay logs.

### 8.2 Check Error Tracking

Look for structured error responses:
```json
{
  "error": {
    "code": "NETWORK_ERROR",
    "message": "Connection failed",
    "category": "NETWORK",
    "correlationId": "uuid-12345",
    "recoveryAction": "retry"
  }
}
```

### 8.3 Monitor Performance

Check for performance warnings:
```
[ClicToPay] Slow payment registration: 5234ms
[ClicToPay] API response time: 3.2s (threshold: 5s)
```

## ✅ Step 9: Test Results Validation

### Plugin Installation ✅
- [ ] Plugin loads without errors
- [ ] Services are properly injected  
- [ ] Webhook endpoint is accessible
- [ ] Configuration validates correctly

### Admin UI Integration ✅
- [ ] Payment method appears in Admin UI
- [ ] Configuration form works
- [ ] Payment method can be enabled/disabled
- [ ] Settings persist correctly

### API Integration ✅
- [ ] Payment registration attempts work
- [ ] Error handling is graceful
- [ ] Retry logic functions properly
- [ ] Network timeouts are handled

### Webhook Security ✅
- [ ] Valid signatures are accepted
- [ ] Invalid signatures are rejected
- [ ] Timestamp validation works
- [ ] Malformed payloads are rejected

### Database Integration ✅
- [ ] Orders are created correctly
- [ ] Payment records are stored
- [ ] State transitions work
- [ ] Metadata is preserved

### Error Handling ✅
- [ ] Network errors are caught
- [ ] API errors are categorized
- [ ] User-friendly messages shown
- [ ] Correlation IDs are generated

## 🐛 Common Issues & Solutions

### Issue: Plugin Not Loading
**Symptoms:** No ClicToPay option in payment methods
**Solution:**
```bash
# Check import in vendure-config.ts
grep -n "ClicToPayPlugin" apps/api/src/vendure-config.ts

# Check for compilation errors
npx tsc --noEmit
```

### Issue: Webhook 404 Errors
**Symptoms:** Webhook calls return 404
**Solution:**
```bash
# Verify endpoint registration
curl -I http://localhost:3000/clictopay/webhook

# Check controller registration in plugin
```

### Issue: Database Connection Errors
**Symptoms:** Cannot save payment method configuration
**Solution:**
```bash
# Check database connection
psql -h localhost -U impact_user -d vendure_impact -c "SELECT 1;"

# Verify environment variables
echo $POSTGRES_USER $POSTGRES_PASSWORD
```

### Issue: Invalid Signature Errors
**Symptoms:** All webhooks return 401
**Solution:**
```bash
# Verify webhook secret matches
echo $CLICTOPAY_WEBHOOK_SECRET

# Test signature generation
node -e "
const crypto = require('crypto');
const secret = 'clictopay_webhook_secret_123';
const payload = '{\"test\": true}';
const timestamp = Math.floor(Date.now() / 1000);
const signature = crypto.createHmac('sha256', secret).update(\`\${timestamp}.\${payload}\`).digest('hex');
console.log(\`t=\${timestamp},v1=\${signature}\`);
"
```

## 🚀 Next Steps

After successful manual testing:

1. **Get Real ClicToPay Credentials**:
   - Register for ClicToPay sandbox account
   - Replace test credentials in environment
   - Test with real API endpoints

2. **Setup ngrok for Webhook Testing**:
   ```bash
   npm install -g ngrok
   ngrok http 3000
   # Use ngrok URL in ClicToPay dashboard
   ```

3. **Test End-to-End Payment Flow**:
   - Complete real payment in sandbox
   - Verify webhook notifications
   - Check order fulfillment

4. **Performance Testing**:
   - Test with high order volumes
   - Monitor API response times
   - Test concurrent webhook processing

5. **Security Validation**:
   - Test HTTPS in staging
   - Verify webhook signature validation
   - Test rate limiting

## 📞 Support

If you encounter issues during testing:

1. **Check logs** in Vendure console
2. **Review configuration** in Admin UI
3. **Test individual components** with provided scripts
4. **Verify environment variables** are correct
5. **Check database connectivity** and permissions

For additional help, refer to:
- `README.md` - Complete plugin documentation
- `TROUBLESHOOTING.md` - Common issues and solutions
- `SETUP_GUIDE.md` - Development environment setup

---

**Happy Testing! 🎉**