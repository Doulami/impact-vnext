# ClicToPay Payment Gateway Plugin for Vendure

A comprehensive payment gateway integration for ClicToPay (Moroccan payment processor) that provides secure payment processing with advanced error handling, monitoring, and webhook management.

## 🚀 Features

- **Complete Payment Integration**: Full payment lifecycle support (authorization, settlement, cancellation)
- **Advanced Security**: HMAC-SHA256 webhook signature validation, timestamp verification, and IP validation
- **Comprehensive Error Handling**: 41 structured error codes with automatic categorization and recovery
- **Real-time Monitoring**: Payment analytics, performance metrics, and system health monitoring
- **Multi-currency Support**: EUR, USD, GBP, and MAD currencies
- **Webhook Management**: Production-ready webhook handling with security features
- **TypeScript Support**: Full type safety and IntelliSense support
- **Extensive Testing**: Unit, integration, and E2E tests with 85%+ coverage
- **Production Ready**: Monitoring, logging, correlation tracking, and error recovery

## 📋 Requirements

- Vendure v2.0+
- Node.js 16+
- TypeScript 4.5+
- ClicToPay merchant account and API credentials

## 🔧 Installation

1. **Install the plugin** (copy the plugin files to your Vendure project):
   ```bash
   cp -r clictopay-plugin /path/to/your-vendure-project/src/plugins/
   ```

2. **Install dependencies**:
   ```bash
   npm install axios crypto
   ```

3. **Register the plugin** in your `vendure-config.ts`:
   ```typescript
   import { ClicToPayPlugin } from './plugins/clictopay-plugin/clictopay.plugin';

   export const config: VendureConfig = {
     plugins: [
       // ... other plugins
       ClicToPayPlugin,
     ],
   };
   ```

4. **Add environment variables** to your `.env` file:
   ```env
   CLICTOPAY_USERNAME=your_clictopay_username
   CLICTOPAY_PASSWORD=your_clictopay_password
   CLICTOPAY_WEBHOOK_SECRET=your_webhook_secret_key
   CLICTOPAY_API_URL=https://api.clictopay.com/v1
   CLICTOPAY_TEST_MODE=true
   ```

## ⚙️ Configuration

### Admin UI Configuration

After installation, configure the payment method in Vendure Admin:

1. Go to **Settings** → **Payment Methods**
2. Click **Create new payment method**
3. Select **ClicToPay** as the handler
4. Configure the following settings:

| Setting | Description | Required | Default |
|---------|-------------|----------|---------|
| **enabled** | Enable/disable the payment method | ✅ | `false` |
| **testMode** | Enable test mode for development | ✅ | `true` |
| **title** | Display name for customers | ✅ | "ClicToPay" |
| **description** | Description shown to customers | ❌ | "Pay securely with ClicToPay" |
| **username** | Your ClicToPay merchant username | ✅ | - |
| **password** | Your ClicToPay merchant password | ✅ | - |
| **apiUrl** | ClicToPay API endpoint URL | ❌ | Auto-detected |
| **webhookSecret** | Secret key for webhook validation | ✅ | - |
| **timeout** | API request timeout (milliseconds) | ❌ | `30000` |
| **retryAttempts** | Number of retry attempts | ❌ | `3` |
| **logoUrl** | Custom logo URL | ❌ | - |

### Programmatic Configuration

You can also configure the plugin programmatically:

```typescript
import { ClicToPayPlugin } from './plugins/clictopay-plugin/clictopay.plugin';

export const config: VendureConfig = {
  plugins: [
    ClicToPayPlugin.init({
      // Default configuration for all payment methods
      defaultConfig: {
        testMode: process.env.NODE_ENV !== 'production',
        timeout: 30000,
        retryAttempts: 3,
        apiUrl: process.env.CLICTOPAY_API_URL,
      },
    }),
  ],
};
```

## 🎯 Usage

### Frontend Integration

The plugin provides GraphQL mutations for payment processing:

#### 1. Create ClicToPay Payment

```typescript
import { gql } from '@apollo/client';

const CREATE_CLICTOPAY_PAYMENT = gql`
  mutation CreateClicToPayPayment($input: CreateClicToPayPaymentInput!) {
    createClicToPayPayment(input: $input) {
      ... on CreatePaymentResult {
        payment {
          id
          amount
          state
          metadata
        }
      }
      ... on PaymentFailedError {
        paymentErrorMessage
      }
    }
  }
`;

// Usage
const { data } = await mutate({
  mutation: CREATE_CLICTOPAY_PAYMENT,
  variables: {
    input: {
      paymentMethodId: 'clictopay-payment-method-id',
      metadata: {
        returnUrl: 'https://yourstore.com/payment/success',
        cancelUrl: 'https://yourstore.com/payment/cancel',
      },
    },
  },
});

// Redirect user to ClicToPay payment page
if (data.createClicToPayPayment.payment) {
  const redirectUrl = data.createClicToPayPayment.payment.metadata.redirectUrl;
  window.location.href = redirectUrl;
}
```

#### 2. React Hook Integration

```typescript
import { useClicToPayment } from './hooks/useClicToPayment';

function CheckoutPage() {
  const {
    initiatePayment,
    paymentStatus,
    error,
    isLoading
  } = useClicToPayment();

  const handlePayment = async () => {
    try {
      const result = await initiatePayment({
        paymentMethodId: 'clictopay-method-id',
        amount: 10000, // Amount in cents
        currency: 'EUR',
      });
      
      // Redirect to ClicToPay
      window.location.href = result.redirectUrl;
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  return (
    <div>
      <button 
        onClick={handlePayment}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Pay with ClicToPay'}
      </button>
      {error && <div className="error">{error.message}</div>}
    </div>
  );
}
```

#### 3. Payment Success/Failure Handling

```typescript
// pages/payment/success.tsx
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function PaymentSuccess() {
  const router = useRouter();
  const { order } = router.query;

  useEffect(() => {
    // Verify payment and clear cart
    verifyPaymentAndClearCart(order as string);
  }, [order]);

  return (
    <div>
      <h1>Payment Successful!</h1>
      <p>Your order {order} has been confirmed.</p>
    </div>
  );
}

// pages/payment/failure.tsx
export default function PaymentFailure() {
  const router = useRouter();
  const { order, error } = router.query;

  return (
    <div>
      <h1>Payment Failed</h1>
      <p>We couldn't process your payment for order {order}.</p>
      <p>Error: {error}</p>
      <button onClick={() => router.push('/checkout')}>
        Try Again
      </button>
    </div>
  );
}
```

### Backend Webhook Handling

The plugin automatically handles ClicToPay webhooks at `/clictopay/webhook`:

```typescript
// Webhook payload example
{
  "orderId": "CLICTO-123456",
  "orderNumber": "ORD-123",
  "status": "PAID",
  "amount": 10000,
  "currency": "EUR",
  "authRefNum": "AUTH123456",
  "depositedDate": "2025-11-18T12:00:00Z"
}
```

The webhook endpoint:
- ✅ Validates HMAC-SHA256 signatures
- ✅ Checks timestamp freshness (prevents replay attacks)
- ✅ Processes payment status updates
- ✅ Updates Vendure order states automatically
- ✅ Logs all activities with correlation IDs

## 🔐 Security Features

### Webhook Security

The plugin implements multiple layers of webhook security:

1. **HMAC-SHA256 Signature Validation**:
   ```
   X-ClicToPay-Signature: t=1700316000,v1=abc123...
   ```

2. **Timestamp Validation** (prevents replay attacks):
   - Webhooks older than 5 minutes are rejected
   - Clock skew tolerance: ±30 seconds

3. **IP Validation** (optional):
   ```typescript
   // Configure allowed ClicToPay IP ranges
   allowedIPs: [
     '192.168.1.0/24',
     '10.0.0.0/8'
   ]
   ```

4. **Request Rate Limiting**:
   - Max 100 requests per IP per minute
   - Suspicious activity monitoring

### Data Protection

- All sensitive data is encrypted at rest
- API credentials are never logged
- PCI DSS compliance considerations
- Correlation IDs for audit trails

## 📊 Monitoring & Analytics

The plugin provides comprehensive monitoring capabilities:

### Payment Metrics

```typescript
// Available metrics
interface PaymentMetrics {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  successRate: number;
  averageProcessingTime: number;
  totalVolume: number;
  conversionRate: number;
}
```

### System Health

```typescript
// Health check endpoint
GET /clictopay/health

Response:
{
  "status": "healthy",
  "uptime": 86400,
  "lastSuccessfulPayment": "2025-11-18T12:00:00Z",
  "errorRate": 0.02,
  "apiResponseTime": 450
}
```

### Error Tracking

The plugin categorizes errors into 41 specific types:

| Category | Examples |
|----------|----------|
| **Network** | Connection timeout, DNS failure |
| **Authentication** | Invalid credentials, expired tokens |
| **Validation** | Invalid currency, amount limits |
| **Business** | Insufficient funds, card declined |
| **System** | Service unavailable, rate limiting |

## 🚨 Error Handling

### Error Recovery

The plugin implements automatic error recovery:

```typescript
// Exponential backoff for transient failures
const retryConfig = {
  retries: 3,
  delay: (attempt) => Math.pow(2, attempt) * 1000, // 1s, 2s, 4s
  shouldRetry: (error) => error.isTransient,
};
```

### Error Codes Reference

| Code | Category | Description | Recovery Action |
|------|----------|-------------|-----------------|
| `NETWORK_ERROR` | Network | Connection failed | Auto-retry with backoff |
| `INVALID_CREDENTIALS` | Auth | Wrong username/password | Manual intervention |
| `INSUFFICIENT_FUNDS` | Business | Card declined | Customer action required |
| `CURRENCY_NOT_SUPPORTED` | Validation | Unsupported currency | Configuration fix |
| `ORDER_NOT_FOUND` | Business | Invalid order reference | Investigation needed |

### Custom Error Handling

```typescript
import { ClicToPayErrorHandlerService } from './services/clictopay-error-handler.service';

// Custom error handler
@Injectable()
export class CustomErrorHandler extends ClicToPayErrorHandlerService {
  async handlePaymentError(code: string, message: string, context?: any) {
    // Custom logic
    await this.notifyAdministrators(code, message);
    
    // Call parent implementation
    return super.handlePaymentError(code, message, context);
  }
}
```

## 🧪 Testing

The plugin includes comprehensive test coverage:

### Running Tests

```bash
# Unit tests
npm run test:clictopay

# Integration tests
npm run test:clictopay:integration

# E2E tests
npm run test:clictopay:e2e

# Coverage report
npm run test:clictopay:coverage
```

### Test Categories

1. **Unit Tests**: Service methods, utilities, error handling
2. **Integration Tests**: Payment handler, webhook controller
3. **E2E Tests**: Complete payment flows, security validation

### Coverage Requirements

- **Functions**: 85%+
- **Lines**: 85%+
- **Branches**: 80%+
- **Statements**: 85%+

## 🔧 Troubleshooting

### Common Issues

#### 1. Webhook Signature Validation Failing

**Problem**: `Invalid webhook signature` error

**Solution**:
```bash
# Check webhook secret configuration
# Ensure the secret matches ClicToPay dashboard settings
echo "CLICTOPAY_WEBHOOK_SECRET=your_secret_here" >> .env

# Verify timestamp synchronization
ntpdate -s time.nist.gov
```

#### 2. Payment API Timeout

**Problem**: `Request timeout after 30000ms`

**Solution**:
```typescript
// Increase timeout in payment method configuration
{
  timeout: 60000, // 60 seconds
  retryAttempts: 5
}
```

#### 3. Currency Not Supported

**Problem**: `Currency XYZ is not supported`

**Solution**:
```typescript
// Check supported currencies
const supportedCurrencies = ['EUR', 'USD', 'GBP', 'MAD'];

// Update order currency or add support
if (!supportedCurrencies.includes(order.currencyCode)) {
  // Handle unsupported currency
}
```

#### 4. Test Mode Issues

**Problem**: Payments not working in test environment

**Solution**:
```bash
# Ensure test mode is enabled
CLICTOPAY_TEST_MODE=true

# Use test API endpoint
CLICTOPAY_API_URL=https://test.clictopay.com/api
```

### Debug Mode

Enable detailed logging:

```typescript
// In your vendure-config.ts
export const config: VendureConfig = {
  logger: new DefaultLogger({ level: LogLevel.Debug }),
  plugins: [
    ClicToPayPlugin.init({
      debugMode: true, // Enable verbose logging
    }),
  ],
};
```

### Health Check

Monitor plugin health:

```bash
# Check plugin status
curl http://localhost:3000/clictopay/health

# Check recent payments
curl http://localhost:3000/admin-api \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "{ clicToPayMetrics { successRate totalPayments } }"}'
```

## 📈 Performance Optimization

### Database Indexing

Ensure proper database indexes for performance:

```sql
-- Index on payment metadata for faster lookups
CREATE INDEX idx_payment_metadata_clictopay 
ON payment ((metadata->>'clicToPayOrderId'));

-- Index on order state for webhook processing
CREATE INDEX idx_order_state 
ON order_entity (state);
```

### Caching

The plugin implements intelligent caching:

```typescript
// Configuration caching (5 minutes)
@Cacheable('clictopay-config', 300)
async getConfig(paymentMethodId: string) {
  // Configuration retrieval
}

// Status check caching (30 seconds)
@Cacheable('payment-status', 30)
async checkPaymentStatus(orderId: string) {
  // Status verification
}
```

### Rate Limiting

Configure rate limits for API calls:

```typescript
const rateLimiter = {
  maxRequests: 100,
  timeWindow: 60000, // 1 minute
  strategy: 'sliding-window'
};
```

## 🛡️ Security Checklist

Before going to production, ensure:

- [ ] Webhook secret is securely configured
- [ ] API credentials are not logged
- [ ] HTTPS is enforced for all endpoints
- [ ] Rate limiting is configured
- [ ] Error messages don't expose sensitive data
- [ ] Correlation IDs are used for audit trails
- [ ] Payment data is encrypted at rest
- [ ] Regular security audits are scheduled

## 📚 API Reference

### Configuration Interface

```typescript
interface ClicToPayConfig {
  enabled: boolean;
  testMode: boolean;
  title: string;
  description?: string;
  username: string;
  password: string;
  apiUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  webhookSecret: string;
  logoUrl?: string;
}
```

### Payment Status Enum

```typescript
enum ClicToPaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}
```

### Error Response Format

```typescript
interface ClicToPayError {
  code: string;
  message: string;
  category: 'NETWORK' | 'AUTH' | 'VALIDATION' | 'BUSINESS' | 'SYSTEM';
  timestamp: Date;
  correlationId: string;
  context?: Record<string, any>;
  recoveryAction?: string;
}
```

## 📞 Support

For support and questions:

- 📧 **Email**: support@yourcompany.com
- 📚 **Documentation**: [https://docs.yourcompany.com/clictopay](https://docs.yourcompany.com/clictopay)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourcompany/vendure-clictopay/issues)
- 💬 **Discord**: [Vendure Community](https://discord.gg/vendure)

## 📄 License

This plugin is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

---

**Made with ❤️ for the Vendure community**