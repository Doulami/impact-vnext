import { addActionBarItem } from '@vendure/admin-ui/core';

export default [
  addActionBarItem({
    id: 'verify-customer-button',
    label: 'Verify Customer',
    locationId: 'customer-detail',
    icon: 'check-circle',
    onClick: async (event, context) => {
      const customerId = context.route.snapshot.params.id;
      
      try {
        const response = await fetch('http://localhost:3000/admin-api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            query: `
              mutation ManuallyVerifyCustomer($customerId: ID!) {
                manuallyVerifyCustomer(customerId: $customerId) {
                  ... on ManualVerifyCustomerSuccess {
                    success
                    message
                    customer {
                      emailAddress
                    }
                  }
                  ... on ManualVerifyCustomerError {
                    message
                  }
                }
              }
            `,
            variables: { customerId },
          }),
        });

        const result = await response.json();
        const verification = result.data.manuallyVerifyCustomer;
        
        if (verification.success) {
          context.notificationService.success(
            `Customer ${verification.customer.emailAddress} verified successfully!`
          );
          window.location.reload();
        } else {
          context.notificationService.error(
            `Verification failed: ${verification.message}`
          );
        }
      } catch (error: any) {
        context.notificationService.error(
          `Error verifying customer: ${error.message || 'Unknown error'}`
        );
      }
    },
    requiresPermission: 'UpdateCustomer',
  }),
];
