import { PluginCommonModule, VendurePlugin, Ctx, RequestContext, ID, TransactionalConnection } from '@vendure/core';
import { gql } from 'graphql-tag';
import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UserService, CustomerService } from '@vendure/core';
import { Allow, Permission } from '@vendure/core';
import { User } from '@vendure/core';

// GraphQL schema extension
const adminApiExtensions = gql`
    extend type Query {
        """
        Get list of unverified customers (Admin only)
        """
        unverifiedCustomers(options: CustomerListOptions): CustomerList!
    }

    extend type Mutation {
        """
        Manually verify a customer account by Customer ID (Admin only)
        """
        manuallyVerifyCustomer(customerId: ID!): ManualVerifyCustomerResult!
        
        """
        Bulk verify multiple customers by email addresses (Admin only)
        """
        bulkVerifyCustomers(emailAddresses: [String!]!): BulkVerifyCustomersResult!
    }

    union ManualVerifyCustomerResult = 
        ManualVerifyCustomerSuccess | 
        ManualVerifyCustomerError

    type ManualVerifyCustomerSuccess {
        success: Boolean!
        customer: Customer!
        message: String!
    }

    type ManualVerifyCustomerError {
        errorCode: String!
        message: String!
    }

    type BulkVerifyCustomersResult {
        totalProcessed: Int!
        successCount: Int!
        errorCount: Int!
        errors: [String!]!
        message: String!
    }
`;

// Resolver for the custom mutation
@Resolver()
export class CustomerVerificationAdminResolver {
    constructor(
        private userService: UserService,
        private customerService: CustomerService,
        private connection: TransactionalConnection,
    ) {}

    @Query()
    @Allow(Permission.ReadCustomer) // Requires ReadCustomer permission
    async unverifiedCustomers(
        @Ctx() ctx: RequestContext,
        @Args() args: { options?: any }
    ): Promise<any> {
        // Get customers where user.verified = false
        const options = args.options || { take: 100 };
        
        const qb = this.connection.getRepository(ctx, 'Customer')
            .createQueryBuilder('customer')
            .leftJoinAndSelect('customer.user', 'user')
            .where('user.verified = :verified', { verified: false })
            .take(options.take || 100)
            .skip(options.skip || 0);

        if (options.filter?.emailAddress) {
            qb.andWhere('customer.emailAddress ILIKE :email', {
                email: `%${options.filter.emailAddress}%`
            });
        }

        const [items, totalItems] = await qb.getManyAndCount();
        
        return {
            items,
            totalItems
        };
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer) // Requires UpdateCustomer permission
    async manuallyVerifyCustomer(
        @Ctx() ctx: RequestContext,
        @Args() args: { customerId: ID }
    ): Promise<any> {
        try {
            const { customerId } = args;

            // Find the customer
            const customer = await this.customerService.findOne(ctx, customerId, ['user']);
            
            if (!customer) {
                return {
                    __typename: 'ManualVerifyCustomerError',
                    errorCode: 'CUSTOMER_NOT_FOUND',
                    message: `Customer with ID ${customerId} not found`
                };
            }

            if (!customer.user) {
                return {
                    __typename: 'ManualVerifyCustomerError',
                    errorCode: 'USER_NOT_FOUND', 
                    message: `No user associated with customer ID ${customerId}`
                };
            }

            // Check if already verified
            if (customer.user.verified) {
                return {
                    __typename: 'ManualVerifyCustomerSuccess',
                    success: true,
                    customer,
                    message: `Customer ${customer.emailAddress} was already verified`
                };
            }

            // Manually verify the user
            // We'll update the user directly since we're bypassing the token flow
            await this.connection.getRepository(ctx, User).update(
                { id: customer.user.id },
                { verified: true }
            );

            // Fetch the updated customer to return
            const updatedCustomer = await this.customerService.findOne(ctx, customerId, ['user']);

            return {
                __typename: 'ManualVerifyCustomerSuccess',
                success: true,
                customer: updatedCustomer,
                message: `Customer ${customer.emailAddress} has been manually verified by admin`
            };

        } catch (error) {
            return {
                __typename: 'ManualVerifyCustomerError',
                errorCode: 'VERIFICATION_FAILED',
                message: `Failed to verify customer: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer) // Requires UpdateCustomer permission
    async bulkVerifyCustomers(
        @Ctx() ctx: RequestContext,
        @Args() args: { emailAddresses: string[] }
    ): Promise<any> {
        const { emailAddresses } = args;
        const results = {
            totalProcessed: emailAddresses.length,
            successCount: 0,
            errorCount: 0,
            errors: [] as string[],
            message: ''
        };

        for (const emailAddress of emailAddresses) {
            try {
                // Find customer by email
                const customers = await this.customerService.findAll(ctx, {
                    filter: { emailAddress: { eq: emailAddress } },
                    take: 1
                }, ['user']);

                if (customers.items.length === 0) {
                    results.errorCount++;
                    results.errors.push(`Customer not found: ${emailAddress}`);
                    continue;
                }

                const customer = customers.items[0];
                
                if (!customer.user) {
                    results.errorCount++;
                    results.errors.push(`No user associated with customer: ${emailAddress}`);
                    continue;
                }

                if (customer.user.verified) {
                    results.successCount++; // Already verified counts as success
                    continue;
                }

                // Verify the user
                await this.connection.getRepository(ctx, User).update(
                    { id: customer.user.id },
                    { verified: true }
                );

                results.successCount++;

            } catch (error) {
                results.errorCount++;
                results.errors.push(`Failed to verify ${emailAddress}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        results.message = `Processed ${results.totalProcessed} customers. ${results.successCount} verified, ${results.errorCount} errors.`;
        return results;
    }
}

/**
 * Plugin to add manual customer verification functionality for admins
 * 
 * This plugin adds a mutation to the Admin API that allows administrators
 * to manually verify customer accounts without requiring email verification tokens.
 * 
 * Usage in Admin API:
 * ```graphql
 * mutation ManuallyVerifyCustomer($customerId: ID!) {
 *   manuallyVerifyCustomer(customerId: $customerId) {
 *     ... on ManualVerifyCustomerSuccess {
 *       success
 *       customer {
 *         id
 *         emailAddress
 *         user {
 *           verified
 *         }
 *       }
 *       message
 *     }
 *     ... on ManualVerifyCustomerError {
 *       errorCode
 *       message
 *     }
 *   }
 * }
 * ```
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [CustomerVerificationAdminResolver]
    },
    compatibility: '^2.0.0',
})
export class CustomerAdminVerificationPlugin {}