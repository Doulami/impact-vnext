# ClicToPay Plugin - Developer Setup Guide

This guide will walk you through setting up a complete development environment for the ClicToPay payment gateway plugin, including ClicToPay sandbox configuration and testing setup.

## 🛠️ Prerequisites

Before starting, ensure you have:

- Node.js 16.x or later
- npm 8.x or later
- Git
- A text editor (VS Code recommended)
- ClicToPay test merchant account

## 📋 Step-by-Step Setup

### 1. Environment Setup

#### Clone and Install

```bash
# Navigate to your Vendure project
cd /path/to/your-vendure-project

# Copy the plugin to your plugins directory
cp -r clictopay-plugin src/plugins/

# Install required dependencies
npm install axios crypto jest ts-jest @types/jest supertest @types/supertest
```

#### Environment Variables

Create a `.env.development` file in your project root:

```env
# ClicToPay Configuration
CLICTOPAY_USERNAME=test_merchant_user
CLICTOPAY_PASSWORD=test_merchant_pass
CLICTOPAY_WEBHOOK_SECRET=dev_webhook_secret_key_123
CLICTOPAY_API_URL=https://sandbox.clictopay.com/api
CLICTOPAY_TEST_MODE=true

# Development Settings
NODE_ENV=development
LOG_LEVEL=debug

# Database (adjust for your setup)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=vendure
DB_PASSWORD=vendure
DB_DATABASE=vendure_dev
```

### 2. ClicToPay Sandbox Account Setup

#### Register Sandbox Account

1. **Visit ClicToPay Developer Portal**:
   ```
   https://developers.clictopay.com/sandbox
   ```

2. **Create Test Merchant Account**:
   - Sign up with your developer email
   - Choose "E-commerce Integration"
   - Select test environment

3. **Get API Credentials**:
   ```
   Username: [PROVIDED_BY_CLICTOPAY]
   Password: [PROVIDED_BY_CLICTOPAY]
   Merchant ID: [YOUR_TEST_MERCHANT_ID]
   ```

4. **Configure Webhook URL**:
   ```
   Webhook URL: https://your-ngrok-url.com/clictopay/webhook
   Webhook Secret: dev_webhook_secret_key_123
   ```

#### Test Cards for Sandbox

Use these test cards in the ClicToPay sandbox:

```javascript
// Successful payment
const testCards = {
  visa: {
    number: '4111111111111111',
    expiryMonth: '12',
    expiryYear: '2025',
    cvv: '123',
    result: 'SUCCESS'
  },
  mastercard: {
    number: '5555555555554444',
    expiryMonth: '10',
    expiryYear: '2025',
    cvv: '456',
    result: 'SUCCESS'
  },
  // Declined payment
  declined: {
    number: '4000000000000002',
    expiryMonth: '12',
    expiryYear: '2025',
    cvv: '123',
    result: 'DECLINED'
  },
  // Insufficient funds
  insufficientFunds: {
    number: '4000000000000119',
    expiryMonth: '12',
    expiryYear: '2025',
    cvv: '123',
    result: 'INSUFFICIENT_FUNDS'
  }
};
```

### 3. Development Tools Setup

#### Install Development Dependencies

```bash
# Testing framework
npm install --save-dev jest ts-jest @types/jest

# HTTP testing
npm install --save-dev supertest @types/supertest

# Code quality
npm install --save-dev eslint prettier @typescript-eslint/eslint-plugin

# Documentation tools
npm install --save-dev typedoc
```

#### Configure TypeScript

Create/update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2019",
    "lib": ["es2019"],
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.spec.ts",
    "**/*.test.ts"
  ]
}
```

#### Setup Testing Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "test:clictopay": "jest --config=src/plugins/clictopay-plugin/tests/jest.config.js",
    "test:clictopay:watch": "jest --config=src/plugins/clictopay-plugin/tests/jest.config.js --watch",
    "test:clictopay:coverage": "jest --config=src/plugins/clictopay-plugin/tests/jest.config.js --coverage",
    "test:clictopay:integration": "jest --config=src/plugins/clictopay-plugin/tests/jest.config.js --testMatch=\"**/*.integration.spec.ts\"",
    "test:clictopay:e2e": "jest --config=src/plugins/clictopay-plugin/tests/jest.config.js --testMatch=\"**/*.e2e.spec.ts\"",
    "lint:clictopay": "eslint src/plugins/clictopay-plugin --ext .ts",
    "lint:clictopay:fix": "eslint src/plugins/clictopay-plugin --ext .ts --fix",
    "build:clictopay": "tsc -p src/plugins/clictopay-plugin",
    "docs:clictopay": "typedoc src/plugins/clictopay-plugin --out docs/clictopay"
  }
}
```

### 4. Development Workflow Setup

#### Git Configuration

Create `.gitignore` entries for the plugin:

```gitignore
# ClicToPay Plugin
/src/plugins/clictopay-plugin/coverage/
/src/plugins/clictopay-plugin/dist/
/src/plugins/clictopay-plugin/.jest-cache/
/src/plugins/clictopay-plugin/node_modules/

# Environment files
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
/logs/clictopay-*.log
```

#### Pre-commit Hooks

Install husky for pre-commit hooks:

```bash
npm install --save-dev husky lint-staged

# Setup husky
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "src/plugins/clictopay-plugin/**/*.{ts,js}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ],
    "src/plugins/clictopay-plugin/**/*.{md,json}": [
      "prettier --write",
      "git add"
    ]
  }
}
```

### 5. Local Development Server

#### Setup ngrok for Webhook Testing

```bash
# Install ngrok
npm install -g ngrok

# Start your Vendure server
npm run dev

# In another terminal, expose localhost
ngrok http 3000

# Update ClicToPay webhook URL with your ngrok URL
# Example: https://abc123.ngrok.io/clictopay/webhook
```

#### Configure Local Vendure

Update your `vendure-config.ts`:

```typescript
import { ClicToPayPlugin } from './plugins/clictopay-plugin/clictopay.plugin';
import { DefaultLogger, LogLevel } from '@vendure/core';

export const config: VendureConfig = {
  logger: new DefaultLogger({ level: LogLevel.Debug }),
  plugins: [
    // ... other plugins
    ClicToPayPlugin.init({
      defaultConfig: {
        testMode: true,
        timeout: 30000,
        retryAttempts: 3,
        apiUrl: process.env.CLICTOPAY_API_URL || 'https://sandbox.clictopay.com/api',
      },
      debugMode: true, // Enable detailed logging
    }),
  ],
  paymentOptions: {
    paymentMethodHandlers: [
      // ClicToPayPlugin registers its handler automatically
    ],
  },
};
```

### 6. Testing Setup

#### Run Initial Tests

```bash
# Run all tests
npm run test:clictopay

# Run tests in watch mode
npm run test:clictopay:watch

# Generate coverage report
npm run test:clictopay:coverage
```

#### Test Database Setup

Create a test database:

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create test database
CREATE DATABASE vendure_clictopay_test;
CREATE USER clictopay_test WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE vendure_clictopay_test TO clictopay_test;
```

Update test environment variables:

```env
# .env.test
DB_DATABASE=vendure_clictopay_test
DB_USERNAME=clictopay_test
DB_PASSWORD=test_password
CLICTOPAY_TEST_MODE=true
```

### 7. Development Debugging

#### Enable Debug Logging

```typescript
// In your test files or development config
process.env.DEBUG = 'clictopay:*';

// Or use the built-in logger
import { Logger } from '@vendure/core';

Logger.useLogger(new DefaultLogger({ level: LogLevel.Verbose }));
```

#### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug ClicToPay Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--config=${workspaceFolder}/src/plugins/clictopay-plugin/tests/jest.config.js",
        "--runInBand"
      ],
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "test"
      }
    },
    {
      "name": "Debug Vendure Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/index.ts",
      "args": [],
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development"
      },
      "runtimeArgs": ["-r", "ts-node/register"]
    }
  ]
}
```

### 8. API Testing with Postman

#### Import ClicToPay Collection

Create a Postman collection for testing:

```json
{
  "info": {
    "name": "ClicToPay Plugin API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "admin_token",
      "value": "{{admin_auth_token}}"
    }
  ],
  "item": [
    {
      "name": "Create Payment",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/shop-api",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"query\": \"mutation { addPaymentToOrder(input: { method: \\\"clictopay\\\", metadata: {} }) { ...on Order { id code state totalWithTax payments { id amount state metadata } } ...on ErrorResult { errorCode message } } }\"\n}"
        }
      }
    },
    {
      "name": "Webhook Test",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/clictopay/webhook",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "X-ClicToPay-Signature",
            "value": "t=1700316000,v1=test_signature"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"orderId\": \"CLICTO-123456\",\n  \"orderNumber\": \"ORD-123\",\n  \"status\": \"PAID\",\n  \"amount\": 10000,\n  \"currency\": \"EUR\"\n}"
        }
      }
    }
  ]
}
```

### 9. Code Quality Setup

#### ESLint Configuration

Create `.eslintrc.js` in the plugin directory:

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-readonly': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  env: {
    node: true,
    jest: true,
  },
};
```

#### Prettier Configuration

Create `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### 10. Continuous Integration Setup

#### GitHub Actions Workflow

Create `.github/workflows/clictopay-tests.yml`:

```yaml
name: ClicToPay Plugin Tests

on:
  push:
    paths: ['src/plugins/clictopay-plugin/**']
  pull_request:
    paths: ['src/plugins/clictopay-plugin/**']

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linting
        run: npm run lint:clictopay
        
      - name: Run tests
        run: npm run test:clictopay:coverage
        env:
          CLICTOPAY_TEST_MODE: true
          
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: clictopay-plugin
```

## 🧪 Development Testing Scenarios

### Test Payment Flows

#### Successful Payment Test

```typescript
describe('Successful Payment Flow', () => {
  it('should complete payment successfully', async () => {
    // 1. Create order in Vendure
    const order = await createTestOrder();
    
    // 2. Initiate ClicToPay payment
    const payment = await initiateClicToPayPayment(order);
    
    // 3. Simulate successful webhook
    await simulateWebhook({
      orderId: payment.clicToPayOrderId,
      status: 'PAID',
      orderNumber: order.code,
    });
    
    // 4. Verify order state
    const updatedOrder = await getOrder(order.id);
    expect(updatedOrder.state).toBe('PaymentSettled');
  });
});
```

#### Failed Payment Test

```typescript
describe('Failed Payment Flow', () => {
  it('should handle payment failure correctly', async () => {
    // Test payment decline scenario
    const payment = await initiateClicToPayPayment(testOrder);
    
    await simulateWebhook({
      orderId: payment.clicToPayOrderId,
      status: 'FAILED',
      orderNumber: testOrder.code,
    });
    
    const updatedOrder = await getOrder(testOrder.id);
    expect(updatedOrder.state).toBe('PaymentDeclined');
  });
});
```

## 📊 Monitoring Setup

### Development Metrics

```typescript
// Enable metrics collection in development
const metricsConfig = {
  enabled: true,
  collectInterval: 5000, // 5 seconds
  exportEndpoint: '/metrics',
  debugMode: true,
};
```

### Log Monitoring

```bash
# Watch ClicToPay logs in real-time
tail -f logs/vendure.log | grep 'ClicToPay'

# Monitor webhook activity
tail -f logs/webhooks.log
```

## 🚀 Next Steps

1. **Run the test suite**: `npm run test:clictopay`
2. **Start development server**: `npm run dev`
3. **Setup ngrok**: Configure webhook URL in ClicToPay dashboard
4. **Test payment flow**: Use test cards to process payments
5. **Monitor logs**: Check for any integration issues
6. **Review documentation**: Read through API docs and examples

## 🆘 Getting Help

- **Plugin Issues**: Check the troubleshooting guide
- **API Questions**: Refer to ClicToPay developer documentation
- **Vendure Integration**: Check Vendure plugin development guide
- **Testing Problems**: Review Jest configuration and test setup

## 📚 Additional Resources

- [ClicToPay API Documentation](https://developers.clictopay.com/docs)
- [Vendure Plugin Development Guide](https://docs.vendure.io/guides/developer-guide/plugins/)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

---

**Happy coding! 🎉**