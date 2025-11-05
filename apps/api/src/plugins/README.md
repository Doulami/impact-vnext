# Customer Admin Verification Plugin

This custom Vendure plugin adds Admin API mutations and queries to manually verify customer accounts without requiring email verification tokens. This is useful for administrative purposes when customers have issues with email verification or need immediate access.

## Features

- ✅ **Manual Verification**: Verify individual customers by Customer ID
- ✅ **Bulk Verification**: Verify multiple customers by email addresses
- ✅ **Unverified Customers Query**: List customers who haven't verified their emails
- ✅ **Proper Permissions**: Requires appropriate admin permissions
- ✅ **Error Handling**: Comprehensive error responses and validation

## Installation

The plugin is automatically loaded in the Vendure configuration. No additional setup required.

## Admin API Usage

### 1. Get Unverified Customers

Query to list customers who haven't verified their email addresses:

```graphql
query UnverifiedCustomers {
  unverifiedCustomers(options: { take: 10, skip: 0 }) {
    items {
      id
      emailAddress
      firstName
      lastName
      createdAt
      user {
        id
        verified
        lastLogin
      }
    }
    totalItems
  }
}
```

With email filter:

```graphql
query UnverifiedCustomersFiltered {
  unverifiedCustomers(options: { 
    take: 10, 
    filter: { emailAddress: "john" } 
  }) {
    items {
      id
      emailAddress
      firstName
      lastName
      user {
        verified
      }
    }
    totalItems
  }
}
```

### 2. Manually Verify Single Customer

Verify a customer by their Customer ID:

```graphql
mutation ManuallyVerifyCustomer($customerId: ID!) {
  manuallyVerifyCustomer(customerId: $customerId) {
    ... on ManualVerifyCustomerSuccess {
      success
      customer {
        id
        emailAddress
        firstName
        lastName
        user {
          verified
          lastLogin
        }
      }
      message
    }
    ... on ManualVerifyCustomerError {
      errorCode
      message
    }
  }
}
```

Variables:
```json
{
  "customerId": "1"
}
```

### 3. Bulk Verify Customers

Verify multiple customers by their email addresses:

```graphql
mutation BulkVerifyCustomers($emailAddresses: [String!]!) {
  bulkVerifyCustomers(emailAddresses: $emailAddresses) {
    totalProcessed
    successCount
    errorCount
    errors
    message
  }
}
```

Variables:
```json
{
  "emailAddresses": [
    "john@example.com",
    "jane@example.com",
    "admin@impactnutrition.com"
  ]
}
```

## Permissions Required

- **ReadCustomer**: Required for `unverifiedCustomers` query
- **UpdateCustomer**: Required for `manuallyVerifyCustomer` and `bulkVerifyCustomers` mutations

## Error Handling

### Single Customer Verification Errors

- `CUSTOMER_NOT_FOUND`: Customer ID doesn't exist
- `USER_NOT_FOUND`: Customer exists but has no associated user
- `VERIFICATION_FAILED`: Database or service error during verification

### Bulk Verification

Bulk operations continue processing even if individual customers fail. Results include:
- `totalProcessed`: Total number of email addresses processed
- `successCount`: Number of successfully verified customers
- `errorCount`: Number of failed verifications
- `errors`: Array of specific error messages
- `message`: Summary message

## Use Cases

1. **Customer Support**: Help customers who didn't receive verification emails
2. **Data Migration**: Verify imported customers from legacy systems
3. **Testing**: Quickly verify test accounts during development
4. **Administrative Cleanup**: Batch verify customers during system maintenance

## Security Notes

- ✅ Requires proper admin authentication
- ✅ Uses Vendure's built-in permission system
- ✅ All operations are logged through Vendure's standard audit trail
- ✅ No email tokens are bypassed - just sets `user.verified = true`

## Technical Implementation

The plugin extends the Admin API with:
- Custom GraphQL schema extensions
- NestJS resolvers with proper dependency injection  
- Direct database access via Vendure's TransactionalConnection
- Proper error handling and type safety

## Compatibility

- Vendure 2.0.0+
- PostgreSQL database
- Admin UI Plugin (for easy access via GraphQL playground)

## Examples for Different Scenarios

### Verify All Customers from CSV Import

```graphql
mutation VerifyImportedCustomers {
  bulkVerifyCustomers(emailAddresses: [
    "customer1@imported.com",
    "customer2@imported.com", 
    "customer3@imported.com"
  ]) {
    message
    successCount
    errorCount
  }
}
```

### Find Customers Who Registered Today But Haven't Verified

```graphql
query TodayUnverifiedCustomers {
  unverifiedCustomers(options: { take: 50 }) {
    items {
      emailAddress
      createdAt
      user {
        verified
      }
    }
  }
}
```

This plugin provides a complete solution for administrative customer verification while maintaining security and auditability.