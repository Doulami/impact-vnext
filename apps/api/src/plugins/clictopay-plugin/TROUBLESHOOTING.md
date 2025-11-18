# ClicToPay Plugin - Troubleshooting Guide

This guide provides solutions to common issues, error codes, debugging techniques, and frequently asked questions for the ClicToPay payment gateway plugin.

## 🚨 Common Issues & Solutions

### 1. Installation & Configuration Issues

#### Issue: Plugin Not Loading

**Symptoms:**
- Plugin doesn't appear in payment methods
- Error: "ClicToPayPlugin is not defined"
- Server fails to start

**Solutions:**

```typescript
// ❌ Wrong - Missing import
export const config: VendureConfig = {
  plugins: [
    ClicToPayPlugin, // Error: not imported
  ],
};

// ✅ Correct - Proper import
import { ClicToPayPlugin } from './plugins/clictopay-plugin/clictopay.plugin';

export const config: VendureConfig = {
  plugins: [
    ClicToPayPlugin,
  ],
};
```

**Additional checks:**
```bash
# Verify plugin files exist
ls -la src/plugins/clictopay-plugin/

# Check TypeScript compilation
npx tsc --noEmit

# Verify dependencies
npm list axios crypto
```

#### Issue: Invalid Configuration

**Symptoms:**
- "Configuration validation failed" error
- Payment method shows as disabled
- Missing required fields error

**Solutions:**

```env
# ❌ Wrong - Missing required fields
CLICTOPAY_USERNAME=
CLICTOPAY_PASSWORD=
# Missing webhook secret

# ✅ Correct - All required fields
CLICTOPAY_USERNAME=your_merchant_username
CLICTOPAY_PASSWORD=your_merchant_password
CLICTOPAY_WEBHOOK_SECRET=your_webhook_secret_key
CLICTOPAY_API_URL=https://api.clictopay.com/v1
CLICTOPAY_TEST_MODE=true
```

**Validation script:**
```typescript
// Add to your startup script
import { ClicToPayConfigService } from './plugins/clictopay-plugin/services/clictopay-config.service';

async function validateConfig() {
  const configService = new ClicToPayConfigService();
  const validation = await configService.validateConfig({
    username: process.env.CLICTOPAY_USERNAME,
    password: process.env.CLICTOPAY_PASSWORD,
    webhookSecret: process.env.CLICTOPAY_WEBHOOK_SECRET,
    // ... other config
  });
  
  if (!validation.isValid) {
    console.error('ClicToPay configuration errors:', validation.errors);
    process.exit(1);
  }
}
```

### 2. Payment Processing Issues

#### Issue: Payment Registration Failure

**Symptoms:**
- "Failed to register payment" error
- API returns error code 1 (Invalid credentials)
- Network timeout errors

**Error Codes Reference:**

| Code | Meaning | Solution |
|------|---------|----------|
| `0` | Success | No action needed |
| `1` | Invalid credentials | Check username/password |
| `2` | Order not found | Verify order exists |
| `3` | Duplicate order | Use unique order numbers |
| `4` | Invalid amount | Check amount format (cents) |
| `5` | Currency not supported | Use EUR, USD, GBP, or MAD |
| `6` | Merchant account disabled | Contact ClicToPay support |
| `7` | Invalid return URL | Verify URL format |

**Solutions:**

```typescript
// Debug payment registration
async function debugPaymentRegistration(order: Order) {
  try {
    console.log('Registering payment for order:', {
      code: order.code,
      amount: order.totalWithTax,
      currency: order.currencyCode,
    });
    
    const result = await clicToPayService.registerPayment(config, {
      userName: config.username,
      password: config.password,
      orderNumber: order.code,
      amount: order.totalWithTax,
      currency: order.currencyCode,
      returnUrl: `${baseUrl}/payment/success?order=${order.code}`,
      failUrl: `${baseUrl}/payment/failure?order=${order.code}`,
    });
    
    console.log('Registration result:', result);
    return result;
  } catch (error) {
    console.error('Payment registration failed:', error);
    throw error;
  }
}
```

#### Issue: Network Timeout Errors

**Symptoms:**
- "Request timeout after 30000ms"
- "ECONNRESET" or "ENOTFOUND" errors
- Intermittent connection failures

**Solutions:**

```typescript
// Increase timeout and add retry logic
const config: ClicToPayConfig = {
  // ... other config
  timeout: 60000, // 60 seconds
  retryAttempts: 5, // Increase retries
};

// Test connectivity
async function testClicToPayConnectivity() {
  const axios = require('axios');
  
  try {
    const response = await axios.get('https://api.clictopay.com/health', {
      timeout: 5000,
    });
    console.log('ClicToPay API is reachable:', response.status);
  } catch (error) {
    console.error('ClicToPay API connectivity test failed:', error.message);
  }
}
```

### 3. Webhook Issues

#### Issue: Invalid Webhook Signature

**Symptoms:**
- "Invalid webhook signature" error in logs
- Webhooks return 401 status
- Payment status not updated

**Solutions:**

```typescript
// Debug webhook signature validation
function debugWebhookSignature(payload: string, signature: string, secret: string) {
  const crypto = require('crypto');
  
  console.log('Webhook debug info:', {
    payloadLength: payload.length,
    signature,
    secret: secret ? '***SET***' : 'MISSING',
  });
  
  // Extract timestamp and signature
  const [timestampPart, signaturePart] = signature.split(',');
  const timestamp = timestampPart.split('=')[1];
  const providedSignature = signaturePart.split('=')[1];
  
  console.log('Parsed signature parts:', {
    timestamp,
    providedSignature: providedSignature.substring(0, 10) + '...',
  });
  
  // Calculate expected signature
  const message = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  
  console.log('Signature validation:', {
    expected: expectedSignature.substring(0, 10) + '...',
    provided: providedSignature.substring(0, 10) + '...',
    match: expectedSignature === providedSignature,
  });
  
  return expectedSignature === providedSignature;
}
```

**Common signature validation issues:**

1. **Wrong webhook secret:**
   ```bash
   # Check ClicToPay dashboard settings
   # Ensure secret matches exactly
   echo $CLICTOPAY_WEBHOOK_SECRET
   ```

2. **Timestamp issues:**
   ```bash
   # Check server time synchronization
   date
   ntpdate -q pool.ntp.org
   
   # Sync if needed
   sudo ntpdate -s time.nist.gov
   ```

3. **Payload encoding:**
   ```typescript
   // Ensure raw body is used, not parsed JSON
   app.use('/clictopay/webhook', express.raw({ type: 'application/json' }));
   ```

#### Issue: Webhook Not Receiving Requests

**Symptoms:**
- No webhook logs in application
- ClicToPay shows webhook failures
- Payments stuck in "Authorized" state

**Solutions:**

1. **Check webhook URL configuration:**
   ```bash
   # Test webhook endpoint accessibility
   curl -X POST https://your-domain.com/clictopay/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": "webhook"}'
   ```

2. **Verify firewall and routing:**
   ```bash
   # Check if port is open
   nmap -p 443 your-domain.com
   
   # Test from external location
   curl -I https://your-domain.com/clictopay/webhook
   ```

3. **ngrok setup for development:**
   ```bash
   # Install ngrok
   npm install -g ngrok
   
   # Start tunnel
   ngrok http 3000
   
   # Update webhook URL in ClicToPay dashboard
   # Use: https://abc123.ngrok.io/clictopay/webhook
   ```

### 4. Database & State Management Issues

#### Issue: Order State Not Updating

**Symptoms:**
- Successful webhooks but order remains "PaymentAuthorized"
- Database inconsistency
- Manual intervention required

**Solutions:**

```sql
-- Check order and payment states
SELECT 
  o.code,
  o.state as order_state,
  p.state as payment_state,
  p.metadata->>'clicToPayOrderId' as clictopay_id
FROM order_entity o
LEFT JOIN payment p ON p.order_id = o.id
WHERE o.code = 'ORD-123';

-- Check for state transition locks
SELECT * FROM order_entity 
WHERE state_transition_locked = true;

-- Reset locked orders (use carefully)
UPDATE order_entity 
SET state_transition_locked = false 
WHERE id = 'order-id-here';
```

**State transition debugging:**
```typescript
// Add detailed logging to payment handler
async function settlePayment(ctx: RequestContext, order: Order, payment: Payment) {
  const logger = Logger.getLogger();
  
  logger.info(`Starting payment settlement`, {
    orderId: order.id,
    orderCode: order.code,
    orderState: order.state,
    paymentId: payment.id,
    paymentState: payment.state,
  });
  
  try {
    const result = await this.paymentService.settlePayment(ctx, payment.id);
    logger.info(`Payment settlement result:`, result);
    return result;
  } catch (error) {
    logger.error(`Payment settlement failed:`, error);
    throw error;
  }
}
```

### 5. Testing & Development Issues

#### Issue: Test Suite Failures

**Symptoms:**
- Jest tests failing intermittently
- Mock service issues
- Timeout errors in tests

**Solutions:**

```typescript
// Fix mock timing issues
beforeEach(async () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  
  // Ensure clean state
  mockApiService.registerPayment.mockReset();
  mockConfigService.getConfig.mockResolvedValue(mockConfig);
});

// Fix async test issues
it('should handle payment successfully', async () => {
  // Use proper async/await
  const result = await handler.createPayment(/* params */);
  
  // Wait for all promises to resolve
  await new Promise(resolve => setImmediate(resolve));
  
  expect(result.state).toBe('Authorized');
}, 10000); // Increase timeout if needed
```

**Test environment isolation:**
```bash
# Use separate test database
export NODE_ENV=test
export DB_DATABASE=vendure_test_clictopay

# Clear test data between runs
npm run test:clictopay -- --forceExit
```

## 🔍 Debugging Techniques

### Enable Detailed Logging

```typescript
// In vendure-config.ts
import { DefaultLogger, LogLevel } from '@vendure/core';

export const config: VendureConfig = {
  logger: new DefaultLogger({ 
    level: LogLevel.Debug,
    timestamp: true,
  }),
  // ... rest of config
};

// Environment-specific logging
const logLevel = process.env.NODE_ENV === 'production' 
  ? LogLevel.Info 
  : LogLevel.Debug;
```

### Network Debugging

```bash
# Monitor network requests
export DEBUG=axios
npm run dev

# Check DNS resolution
nslookup api.clictopay.com

# Test SSL connectivity
openssl s_client -connect api.clictopay.com:443

# Monitor webhook requests
tcpdump -i any port 443 -v
```

### Database Debugging

```sql
-- Check recent payments
SELECT 
  p.id,
  p.created_at,
  p.state,
  p.amount,
  p.metadata,
  o.code as order_code
FROM payment p
JOIN order_entity o ON p.order_id = o.id
WHERE p.created_at > NOW() - INTERVAL '1 hour'
ORDER BY p.created_at DESC;

-- Check webhook processing logs
SELECT * FROM clictopay_webhook_log 
ORDER BY processed_at DESC 
LIMIT 10;
```

### Performance Debugging

```typescript
// Add timing measurements
async function registerPayment(config: ClicToPayConfig, request: ClicToPayRegisterRequest) {
  const startTime = Date.now();
  
  try {
    const result = await apiCall(config, request);
    const duration = Date.now() - startTime;
    
    this.monitoringService.recordPaymentLatency('register_payment', duration);
    
    if (duration > 5000) {
      this.logger.warn(`Slow payment registration: ${duration}ms`, {
        orderNumber: request.orderNumber,
        duration,
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    this.logger.error(`Payment registration failed after ${duration}ms`, error);
    throw error;
  }
}
```

## 📊 Monitoring & Health Checks

### Health Check Endpoint

```bash
# Check plugin health
curl http://localhost:3000/clictopay/health

# Expected response
{
  "status": "healthy",
  "uptime": 3600,
  "lastSuccessfulPayment": "2025-11-18T12:00:00Z",
  "errorRate": 0.02,
  "apiResponseTime": 450
}
```

### Metrics Collection

```typescript
// Add custom metrics
interface ClicToPayMetrics {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  averageProcessingTime: number;
  errorsByCategory: Record<string, number>;
}

// Query metrics
const metrics = await monitoringService.getPaymentMetrics({
  timeRange: '24h',
  includeBreakdown: true,
});
```

### Log Analysis

```bash
# Find payment errors
grep -E "(ERROR|WARN)" logs/vendure.log | grep -i clictopay

# Count webhook processing
grep "webhook_processed" logs/vendure.log | wc -l

# Monitor API response times
grep "api_response_time" logs/vendure.log | tail -20
```

## ❓ Frequently Asked Questions

### Q1: How do I switch between test and production modes?

**Answer:**
```env
# Test mode
CLICTOPAY_TEST_MODE=true
CLICTOPAY_API_URL=https://sandbox.clictopay.com/api

# Production mode
CLICTOPAY_TEST_MODE=false
CLICTOPAY_API_URL=https://api.clictopay.com/v1
```

Update your payment method configuration in Vendure Admin UI accordingly.

### Q2: What currencies are supported?

**Answer:** ClicToPay supports:
- EUR (Euro)
- USD (US Dollar) 
- GBP (British Pound)
- MAD (Moroccan Dirham)

Ensure your Vendure channels are configured with supported currencies only.

### Q3: How do I handle failed payments?

**Answer:** Failed payments are automatically handled by the plugin:

1. **Webhook notification** updates order state to "PaymentDeclined"
2. **Customer notification** (if configured) is sent
3. **Inventory** is automatically released
4. **Admin notification** (optional) can be configured

### Q4: Can I customize the payment flow?

**Answer:** Yes, you can customize various aspects:

```typescript
// Custom payment handler
export class CustomClicToPayHandler extends ClicToPayPaymentHandler {
  async createPayment(ctx, order, amount, args, method, metadata) {
    // Add custom logic before payment
    const customMetadata = {
      ...metadata,
      customField: 'value',
    };
    
    return super.createPayment(ctx, order, amount, args, method, customMetadata);
  }
}
```

### Q5: How do I handle refunds?

**Answer:** ClicToPay doesn't support automatic refunds via API. The plugin provides manual refund instructions:

```typescript
// Refunds require manual processing
const refundResult = await handler.createRefund(/* params */);
// Result includes instructions for manual refund processing
```

### Q6: What happens if webhooks fail?

**Answer:** The plugin implements several fallback mechanisms:

1. **Retry logic** for transient failures
2. **Manual payment verification** via admin interface
3. **Reconciliation reports** for payment status checks
4. **Alert notifications** for webhook failures

### Q7: How do I migrate from test to production?

**Answer:** Follow this checklist:

- [ ] Update environment variables
- [ ] Change API URLs to production
- [ ] Update webhook URLs in ClicToPay dashboard
- [ ] Test with small amounts first
- [ ] Monitor logs for any issues
- [ ] Enable production monitoring

## 🆘 Getting Help

### Support Channels

1. **Technical Issues:**
   - Check this troubleshooting guide
   - Review plugin logs
   - Test with minimal configuration

2. **ClicToPay API Issues:**
   - Contact ClicToPay support
   - Check their status page
   - Verify account configuration

3. **Vendure Integration Issues:**
   - Check Vendure documentation
   - Review plugin compatibility
   - Test with clean Vendure instance

### Error Reporting

When reporting issues, include:

```bash
# System information
node --version
npm --version
grep "version" package.json

# Plugin configuration (redact sensitive data)
echo "Configuration:"
env | grep CLICTOPAY | sed 's/=.*/=***/'

# Recent error logs
tail -50 logs/vendure.log | grep -i clictopay

# Database state
# Run relevant SQL queries (without sensitive data)
```

### Debug Information Script

```bash
#!/bin/bash
# debug-clictopay.sh - Collect debug information

echo "=== ClicToPay Plugin Debug Information ==="
echo "Date: $(date)"
echo "Node Version: $(node --version)"
echo "NPM Version: $(npm --version)"
echo ""

echo "=== Environment Variables ==="
env | grep CLICTOPAY | sed 's/=.*/=***/'
echo ""

echo "=== Plugin Files ==="
find src/plugins/clictopay-plugin -name "*.ts" | head -10
echo ""

echo "=== Recent Logs ==="
tail -20 logs/vendure.log | grep -i clictopay
echo ""

echo "=== Health Check ==="
curl -s http://localhost:3000/clictopay/health || echo "Health check failed"
```

## 🛠️ Recovery Procedures

### Manual Payment Settlement

If webhooks fail and payments need manual settlement:

```sql
-- Find pending payments
SELECT p.id, p.metadata->>'clicToPayOrderId', o.code 
FROM payment p 
JOIN order_entity o ON p.order_id = o.id 
WHERE p.state = 'Authorized' 
  AND p.metadata->>'clicToPayOrderId' IS NOT NULL;

-- After confirming payment in ClicToPay dashboard
-- Update payment state (use Vendure Admin UI instead)
```

### Data Consistency Checks

```typescript
// Verify payment-order consistency
async function verifyPaymentConsistency() {
  const inconsistentPayments = await connection.query(`
    SELECT p.id, p.state, o.state, p.metadata 
    FROM payment p 
    JOIN order_entity o ON p.order_id = o.id 
    WHERE p.method = 'clictopay' 
      AND p.state = 'Settled' 
      AND o.state != 'PaymentSettled'
  `);
  
  return inconsistentPayments;
}
```

---

## 📞 Emergency Contacts

- **Critical Issues**: Create GitHub issue with "urgent" label
- **Production Downtime**: Follow your incident response procedures
- **ClicToPay Outages**: Check their status page first

Remember: Most issues can be resolved by carefully checking configuration, reviewing logs, and following the debugging steps in this guide.