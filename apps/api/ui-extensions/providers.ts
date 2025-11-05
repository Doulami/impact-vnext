import { addActionBarItem } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

const MANUALLY_VERIFY_CUSTOMER = gql`
  mutation ManuallyVerifyCustomer($customerId: ID!) {
    manuallyVerifyCustomer(customerId: $customerId) {
      ... on ManualVerifyCustomerSuccess {
        success
        message
        customer {
          id
          emailAddress
          user {
            verified
          }
        }
      }
      ... on ManualVerifyCustomerError {
        errorCode
        message
      }
    }
  }
`;

export default [
  addActionBarItem({
    id: 'verify-customer-button',
    label: 'Verify Customer',
    locationId: 'customer-detail',
    icon: 'check-circle',
    buttonState: (context) => {
      return context.entity$.pipe(
        map((customer: any) => {
          // Only show button if customer is not verified
          const isVerified = customer?.user?.verified;
          return {
            disabled: false,
            visible: !isVerified,
          };
        })
      );
    },
    onClick: async (event, context) => {
      try {
        const customerId = context.route.snapshot.params.id;
        
        const result = await firstValueFrom(
          context.dataService.mutate(MANUALLY_VERIFY_CUSTOMER, {
            customerId,
          })
        );

        const verification = (result as any).manuallyVerifyCustomer;
        
        if (verification.success) {
          context.notificationService.success(
            `Customer ${verification.customer.emailAddress} verified successfully!`
          );
          
          // Refresh the current page to show updated verification status
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