# Customer Admin Verification Plugin

A production-ready Vendure plugin that adds customer verification functionality to the AdminUI.

## Features

- **Manual verification**: Verify individual customers from their detail page
- **Bulk verification**: Verify multiple customers by email addresses
- **Query unverified customers**: Get list of customers pending verification
- **AdminUI integration**: One-click verification button in customer details

## Installation & Setup

1. Plugin is already installed in `src/plugins/customer-admin-verification.plugin.ts`
2. Already added to `vendure-config.ts` plugins array
3. Ready to use - restart server if needed

## Usage

### AdminUI (Manual Verification)
1. Go to `http://localhost:4200/admin`
2. Navigate to **Customers** → Select a customer
3. Look for **Verify Customer** button in the action bar
4. Click to instantly verify the customer
5. Page will refresh showing updated verification status

### GraphQL API Usage

#### Verify Single Customer
```graphql
mutation {
  manuallyVerifyCustomer(customerId: "1") {
    id
    emailAddress
    verified
  }
}
```

#### Bulk Verify Customers
```graphql
mutation {
  bulkVerifyCustomers(emailAddresses: [
    "user1@example.com",
    "user2@example.com"
  ]) {
    id
    emailAddress
    verified
  }
}
```

#### Get Unverified Customers
```graphql
query {
  unverifiedCustomers(options: {
    take: 20
    skip: 0
  }) {
    items {
      id
      emailAddress
      firstName
      lastName
      createdAt
    }
    totalItems
  }
}
```

## Technical Implementation

### Plugin Architecture
- **Resolver**: `CustomerAdminResolver` adds GraphQL operations
- **Service**: `CustomerService` handles business logic
- **UI Extension**: Adds button to customer detail pages
- **Permissions**: Uses existing `Update` permission on `Customer` entity

### GraphQL Operations Added
- `manuallyVerifyCustomer(customerId: ID!): Customer`
- `bulkVerifyCustomers(emailAddresses: [String!]!): [Customer!]!`
- `unverifiedCustomers(options: CustomerListOptions): CustomerList`

### AdminUI Extension
Located in `/ui-extensions/providers.ts`:
- Uses `addActionBarItem()` to add button
- Targets `customer-detail` location
- Makes direct API calls via fetch
- Handles success/error states

## Production Considerations

### Security
- All operations require admin authentication
- Uses existing Vendure permission system
- No additional API endpoints exposed to Shop API

### Performance
- Bulk operations process up to 100 customers at once
- Database queries are optimized with proper indexes
- UI button only loads when needed

### Error Handling
- Invalid customer IDs return appropriate errors
- Non-existent emails are skipped in bulk operations
- AdminUI shows success/error notifications

## Troubleshooting

### Button Not Appearing
1. Clear AdminUI cache: `rm -rf admin-ui`
2. Rebuild: `npm run build`
3. Restart server: `npm run dev`
4. Wait for compilation to complete

### API Errors
- Check server logs for GraphQL errors
- Verify admin user has Customer update permissions
- Test operations directly in GraphQL Playground at `http://localhost:3000/admin-api`

### CORS Issues
Ensure `vendure-config.ts` includes proper CORS configuration:
```typescript
cors: {
  origin: ['http://localhost:4200', 'http://localhost:3000'],
  credentials: true,
}
```

## Future Enhancements

### Potential Features
- Email notifications when customers are verified
- Verification audit log
- Bulk verification CSV upload
- Automated verification rules
- Customer verification status dashboard

### Implementation Notes
- Plugin is compatible with Vendure 3.0+
- Uses standard Vendure plugin patterns
- Follows GraphQL best practices
- AdminUI extension uses Angular framework (Vendure's UI system)

## Development Guidelines

### Adding New Operations
1. Add GraphQL operation to resolver
2. Implement business logic in service
3. Update permissions if needed
4. Test via GraphQL Playground
5. Add UI extension if needed

### Testing
```bash
# Test plugin loads correctly
npm run dev

# Test GraphQL operations
curl -X POST http://localhost:3000/admin-api \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"query":"{ unverifiedCustomers { totalItems } }"}'
```

### Code Style
- Use TypeScript strict mode
- Follow Vendure plugin conventions
- Add proper error handling
- Include JSDoc comments for complex functions

This plugin serves as a template for future Vendure plugin development and demonstrates best practices for AdminUI extensions.