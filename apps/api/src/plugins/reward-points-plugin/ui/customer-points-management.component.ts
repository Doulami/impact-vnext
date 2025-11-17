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
                availablePoints
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
            availablePoints
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
    
    // Expose Math to template
    Math = Math;
    
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
        if (!this.adjustForm.valid) {
            this.notificationService.error('Please fill in all required fields correctly');
            return;
        }

        const input = this.adjustForm.value;
        const pointsToAdjust = input.points;
        
        // Client-side validation: prevent removing more than available points
        if (pointsToAdjust < 0) {
            const availablePoints = this.selectedCustomer?.availablePoints || 0;
            const pointsToRemove = Math.abs(pointsToAdjust);
            const reservedPoints = this.getReservedPoints(this.selectedCustomer);
            
            if (pointsToRemove > availablePoints) {
                this.notificationService.error(
                    `Cannot remove ${pointsToRemove} points. Only ${availablePoints} points are available. ` +
                    `${reservedPoints} points are reserved in pending orders and cannot be removed.`
                );
                return;
            }
        }
        
        this.dataService.mutate(ADJUST_CUSTOMER_POINTS, { input }).subscribe({
            next: (result: any) => {
                console.log('Adjust points mutation result:', result);
                
                const operation = input.points > 0 ? 'credited' : 'debited';
                this.notificationService.success(`${Math.abs(input.points)} points ${operation} successfully`);
                
                // Close modal first
                this.cancelAdjust();
                
                // Reload all customers to get fresh data with updated availablePoints
                this.loadCustomers();
            },
            error: (error) => {
                console.error('Failed to adjust customer points:', error);
                const errorMessage = error?.message || error?.graphQLErrors?.[0]?.message || 'Failed to adjust customer points';
                this.notificationService.error(errorMessage);
                this.changeDetector.markForCheck();
            }
        });
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

    getReservedPoints(customer: any): number {
        return (customer.balance || 0) - (customer.availablePoints || 0);
    }
}
