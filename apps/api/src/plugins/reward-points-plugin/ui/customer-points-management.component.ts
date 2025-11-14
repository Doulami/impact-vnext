import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
    DataService,
    NotificationService,
} from '@vendure/admin-ui/core';
import gql from 'graphql-tag';

const GET_ALL_CUSTOMER_REWARD_POINTS = gql`
    query GetAllCustomerRewardPoints {
        allCustomerRewardPoints {
            items {
                id
                customerId
                customer {
                    id
                    firstName
                    lastName
                    emailAddress
                }
                balance
                lifetimeEarned
                lifetimeRedeemed
                updatedAt
            }
            totalItems
        }
    }
`;

const ADJUST_CUSTOMER_POINTS = gql`
    mutation AdjustCustomerPoints($input: AdjustCustomerPointsInput!) {
        adjustCustomerPoints(input: $input) {
            id
            balance
            lifetimeEarned
            lifetimeRedeemed
        }
    }
`;

@Component({
    selector: 'customer-points-management',
    templateUrl: './customer-points-management.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class CustomerPointsManagementComponent implements OnInit {
    customers: any[] = [];
    totalItems = 0;
    loading = false;
    
    adjustForm: FormGroup;
    selectedCustomer: any = null;
    showAdjustModal = false;
    
    constructor(
        private formBuilder: FormBuilder,
        private dataService: DataService,
        private notificationService: NotificationService,
        private changeDetector: ChangeDetectorRef,
    ) {
        this.adjustForm = this.formBuilder.group({
            customerId: ['', Validators.required],
            points: [0, [Validators.required]],
            description: ['Manual adjustment', [Validators.required]],
        });
    }

    ngOnInit() {
        this.loadCustomers();
    }

    private loadCustomers() {
        this.loading = true;
        this.dataService.query(GET_ALL_CUSTOMER_REWARD_POINTS).stream$.subscribe({
            next: (result: any) => {
                console.log('Customer points query response:', result);
                const data = result.allCustomerRewardPoints || result.data?.allCustomerRewardPoints;
                this.customers = data?.items || [];
                this.totalItems = data?.totalItems || 0;
                this.loading = false;
                this.changeDetector.markForCheck();
            },
            error: (error) => {
                console.error('Failed to load customers:', error);
                this.loading = false;
                this.notificationService.error('Failed to load customer points');
                this.changeDetector.markForCheck();
            }
        });
    }

    openAdjustDialog(customer: any) {
        this.selectedCustomer = customer;
        this.showAdjustModal = true;
        this.adjustForm.patchValue({
            customerId: customer.customerId,
            points: 0,
            description: 'Manual adjustment',
        });
    }

    adjustCustomerPoints() {
        if (this.adjustForm.valid) {
            const input = this.adjustForm.value;
            
            this.dataService.mutate(ADJUST_CUSTOMER_POINTS, { input }).subscribe({
                next: (result: any) => {
                    const data = result.adjustCustomerPoints || result.data?.adjustCustomerPoints;
                    if (data) {
                        // Update the customer in the list
                        const customerIndex = this.customers.findIndex(c => c.customerId === input.customerId);
                        if (customerIndex >= 0) {
                            this.customers[customerIndex] = {
                                ...this.customers[customerIndex],
                                balance: data.balance,
                                lifetimeEarned: data.lifetimeEarned,
                                lifetimeRedeemed: data.lifetimeRedeemed,
                            };
                        }
                        
                        this.cancelAdjust();
                        const operation = input.points > 0 ? 'credited' : 'debited';
                        this.notificationService.success(`${Math.abs(input.points)} points ${operation} successfully`);
                        this.changeDetector.markForCheck();
                    }
                },
                error: (error) => {
                    console.error('Failed to adjust customer points:', error);
                    this.notificationService.error('Failed to adjust customer points');
                }
            });
        }
    }

    cancelAdjust() {
        this.selectedCustomer = null;
        this.showAdjustModal = false;
        this.adjustForm.reset();
    }

    getCustomerDisplayName(customer: any): string {
        if (!customer) return 'Unknown Customer';
        if (customer.firstName && customer.lastName) {
            return `${customer.firstName} ${customer.lastName}`;
        }
        return customer.emailAddress || `Customer ${customer.id}`;
    }
}