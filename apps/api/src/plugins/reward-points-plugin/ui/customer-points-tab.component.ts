import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
    DataService,
    NotificationService,
} from '@vendure/admin-ui/core';
import gql from 'graphql-tag';

const GET_CUSTOMER_REWARD_POINTS = gql`
    query GetCustomerRewardPoints($customerId: ID!) {
        customerRewardPoints(customerId: $customerId) {
            id
            customerId
            balance
            availablePoints
            lifetimeEarned
            lifetimeRedeemed
            updatedAt
        }
    }
`;

const GET_CUSTOMER_TRANSACTION_HISTORY = gql`
    query GetCustomerTransactionHistory($customerId: ID!, $options: RewardTransactionListOptions) {
        rewardTransactionHistory(customerId: $customerId, options: $options) {
            items {
                id
                type
                points
                orderTotal
                description
                createdAt
                orderId
                order {
                    id
                    code
                }
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
    selector: 'customer-points-tab',
    template: `
        <div class="page-block">
            <!-- Points Summary & Management Section -->
            <div class="card" *ngIf="customerPoints">
                <div class="card-header">
                    <h3>Reward Points Summary</h3>
                </div>
                <div class="card-body">
                    <table class="points-summary-table">
                        <thead>
                            <tr>
                                <th class="left-align">Point Type</th>
                                <th class="center-align">Amount</th>
                                <th class="center-align">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="available-points-row">
                                <td class="point-type">
                                    <span class="point-icon available-icon">💚</span>
                                    <strong>Available Points</strong>
                                    <small class="point-description">Ready to use or remove</small>
                                </td>
                                <td class="point-amount available-amount">
                                    <span class="point-number">{{ customerPoints.availablePoints || 0 }}</span>
                                    <span class="point-label">points</span>
                                </td>
                                <td class="point-status">
                                    <span class="status-badge available-badge" *ngIf="(customerPoints.availablePoints || 0) > 0">✓ Usable</span>
                                    <span class="status-badge empty-badge" *ngIf="(customerPoints.availablePoints || 0) === 0">No points</span>
                                </td>
                            </tr>
                            <tr class="reserved-points-row">
                                <td class="point-type">
                                    <span class="point-icon reserved-icon">🔒</span>
                                    <strong>Reserved Points</strong>
                                    <small class="point-description">Locked in pending orders</small>
                                </td>
                                <td class="point-amount reserved-amount">
                                    <span class="point-number">{{ getReservedPoints() }}</span>
                                    <span class="point-label">points</span>
                                </td>
                                <td class="point-status">
                                    <span class="status-badge reserved-badge" *ngIf="getReservedPoints() > 0">⏳ Reserved</span>
                                    <span class="status-badge empty-badge" *ngIf="getReservedPoints() === 0">None reserved</span>
                                </td>
                            </tr>
                            <tr class="earned-points-row">
                                <td class="point-type">
                                    <span class="point-icon earned-icon">📈</span>
                                    <strong>Lifetime Earned</strong>
                                    <small class="point-description">Total points earned ever</small>
                                </td>
                                <td class="point-amount earned-amount">
                                    <span class="point-number">{{ customerPoints.lifetimeEarned || 0 }}</span>
                                    <span class="point-label">points</span>
                                </td>
                                <td class="point-status">
                                    <span class="status-badge earned-badge">📊 History</span>
                                </td>
                            </tr>
                            <tr class="redeemed-points-row">
                                <td class="point-type">
                                    <span class="point-icon redeemed-icon">📉</span>
                                    <strong>Lifetime Redeemed</strong>
                                    <small class="point-description">Total points spent ever</small>
                                </td>
                                <td class="point-amount redeemed-amount">
                                    <span class="point-number">{{ customerPoints.lifetimeRedeemed || 0 }}</span>
                                    <span class="point-label">points</span>
                                </td>
                                <td class="point-status">
                                    <span class="status-badge redeemed-badge">📊 History</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <!-- Balance Summary -->
                    <div class="balance-summary">
                        <div class="total-balance">
                            <div class="balance-info">
                                <span class="balance-label">Total Current Balance:</span>
                                <span class="balance-amount" [class]="(customerPoints.balance || 0) > 0 ? 'positive-balance' : 'zero-balance'">
                                    {{ customerPoints.balance || 0 }} points
                                </span>
                            </div>
                            <div class="balance-actions">
                                <button 
                                    class="btn btn-primary adjust-points-btn" 
                                    (click)="openAdjustDialog()"
                                    [disabled]="!customerPoints">
                                    <span class="btn-icon">⚡</span>
                                    Adjust Points
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Transaction History Section -->
            <div class="card">
                <div class="card-header">
                    <h3>Transaction History</h3>
                </div>
                <div class="card-body">
                    <div *ngIf="loading" class="text-center">
                        <vdr-loading></vdr-loading>
                    </div>
                    <table class="table" *ngIf="!loading && transactions.length > 0">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Points</th>
                                <th>Order</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let transaction of transactions">
                                <td>{{ transaction.createdAt | date:'short' }}</td>
                                <td>
                                    <span class="badge" [class]="getTransactionTypeBadgeClass(transaction.type)">
                                        {{ transaction.type }}
                                    </span>
                                </td>
                                <td>
                                    <span [class]="transaction.points > 0 ? 'text-success' : 'text-danger'">
                                        {{ transaction.points > 0 ? '+' : '' }}{{ transaction.points }}
                                    </span>
                                </td>
                                <td>
                                    <a *ngIf="transaction.order" 
                                       [routerLink]="['/orders', transaction.order.id]">
                                        {{ transaction.order.code }}
                                    </a>
                                    <span *ngIf="!transaction.order">-</span>
                                </td>
                                <td>{{ transaction.description }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div *ngIf="!loading && transactions.length === 0" class="text-center text-muted">
                        No transactions found
                    </div>
                </div>
            </div>
        </div>

        <!-- Adjust Points Modal -->
        <div *ngIf="showAdjustModal" class="modal-backdrop" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;" (click)="cancelAdjust()">
            <div class="modal-dialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 400px; z-index: 1001; box-shadow: 0 4px 12px rgba(0,0,0,0.3);" (click)="$event.stopPropagation()">
                <h3 style="margin-top: 0; margin-bottom: 20px; color: #333;">Adjust Customer Points</h3>
                
                <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
                    <div style="margin-bottom: 10px;">
                        <strong>Total Balance:</strong> {{ customerPoints?.balance || 0 }} points
                    </div>
                    <div style="margin-bottom: 10px; color: #28a745;">
                        <strong>Available Points:</strong> {{ customerPoints?.availablePoints || 0 }} points
                        <small style="display: block; color: #28a745; margin-top: 4px; font-weight: 600;">
                            ✓ Can remove up to {{ customerPoints?.availablePoints || 0 }} points
                        </small>
                    </div>
                    <div style="color: #fd7e14;">
                        <strong>Reserved Points:</strong> {{ getReservedPoints() }} points
                        <small style="display: block; color: #dc3545; margin-top: 4px; font-weight: 600;">
                            ⚠ Protected - Locked in pending orders
                        </small>
                    </div>
                </div>
                
                <form [formGroup]="adjustForm" (ngSubmit)="adjustCustomerPoints()">
                    <div style="margin-bottom: 15px;">
                        <label for="points" style="font-weight: bold; display: block; margin-bottom: 5px;">Points to Add/Remove:</label>
                        <input 
                            id="points" 
                            type="number" 
                            formControlName="points" 
                            style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px;"
                            placeholder="Enter positive number to add, negative to remove">
                        <small style="color: #666; display: block; margin-top: 5px;">
                            Example: 1000 (adds points), -500 (removes points)
                        </small>
                        
                        <!-- Warning when trying to remove more than available -->
                        <div *ngIf="adjustForm.get('points')?.value < 0 && Math.abs(adjustForm.get('points')?.value || 0) > (customerPoints?.availablePoints || 0)"
                             style="margin-top: 8px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; color: #856404;">
                            <strong>⚠ Warning:</strong> Cannot remove {{ Math.abs(adjustForm.get('points')?.value || 0) }} points.
                            Only {{ customerPoints?.availablePoints || 0 }} points are available.
                            {{ getReservedPoints() }} points are reserved in pending orders.
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label for="description" style="font-weight: bold; display: block; margin-bottom: 5px;">Admin Note:</label>
                        <textarea 
                            id="description" 
                            formControlName="description" 
                            style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px; min-height: 80px; resize: vertical;"
                            placeholder="Reason for adjustment">
                        </textarea>
                    </div>
                    
                    <div style="text-align: right; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
                        <button 
                            type="button" 
                            (click)="cancelAdjust()" 
                            style="margin-right: 10px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            [disabled]="!adjustForm.valid || adjusting"
                            style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;"
                            [style.opacity]="(!adjustForm.valid || adjusting) ? '0.5' : '1'">
                            <span *ngIf="adjusting">Adjusting...</span>
                            <span *ngIf="!adjusting">Adjust Points</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `,
    styleUrls: ['./customer-points-tab.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class CustomerPointsTabComponent implements OnInit {
    customerId: string;
    customerPoints: any = null;
    transactions: any[] = [];
    loading = false;
    
    adjustForm: FormGroup;
    showAdjustModal = false;
    adjusting = false;

    constructor(
        private route: ActivatedRoute,
        private formBuilder: FormBuilder,
        private dataService: DataService,
        private notificationService: NotificationService,
        private changeDetector: ChangeDetectorRef,
    ) {
        this.adjustForm = this.formBuilder.group({
            points: [0, [Validators.required, Validators.pattern(/^-?\d+$/)]],
            description: ['Manual adjustment', [Validators.required]],
        });
    }

    ngOnInit() {
        // Get customer ID from route params - try different route levels
        this.customerId = this.route.snapshot.paramMap.get('id') || 
                         this.route.parent?.snapshot.paramMap.get('id') || 
                         this.route.parent?.parent?.snapshot.paramMap.get('id') || '';
        
        if (this.customerId) {
            this.loadCustomerPoints();
            this.loadTransactionHistory();
        }
    }

    private loadCustomerPoints() {
        this.loading = true;
        this.dataService.query(GET_CUSTOMER_REWARD_POINTS, { customerId: this.customerId }).stream$.subscribe({
            next: (result: any) => {
                this.customerPoints = result.customerRewardPoints;
                this.loading = false;
                this.changeDetector.markForCheck();
            },
            error: (error) => {
                console.error('Failed to load customer points:', error);
                this.loading = false;
                this.changeDetector.markForCheck();
            }
        });
    }

    private loadTransactionHistory() {
        this.dataService.query(GET_CUSTOMER_TRANSACTION_HISTORY, {
            customerId: this.customerId,
            options: { take: 50 }
        }).stream$.subscribe({
            next: (result: any) => {
                this.transactions = result.rewardTransactionHistory?.items || [];
                this.changeDetector.markForCheck();
            },
            error: (error) => {
                console.error('Failed to load transaction history:', error);
                this.changeDetector.markForCheck();
            }
        });
    }

    openAdjustDialog() {
        this.showAdjustModal = true;
        this.adjustForm.patchValue({
            points: 0,
            description: 'Manual adjustment',
        });
    }

    adjustCustomerPoints() {
        if (!this.adjustForm.valid) {
            this.notificationService.error('Please fill in all required fields correctly');
            return;
        }

        const input = {
            customerId: this.customerId,
            points: this.adjustForm.value.points,
            description: this.adjustForm.value.description,
        };

        // Client-side validation for removing points
        if (input.points < 0) {
            const availablePoints = this.customerPoints?.availablePoints || 0;
            const pointsToRemove = Math.abs(input.points);
            
            if (pointsToRemove > availablePoints) {
                this.notificationService.error(
                    `Cannot remove ${pointsToRemove} points. Only ${availablePoints} points are available.`
                );
                return;
            }
        }

        this.adjusting = true;
        this.dataService.mutate(ADJUST_CUSTOMER_POINTS, { input }).subscribe({
            next: (result: any) => {
                const operation = input.points > 0 ? 'credited' : 'debited';
                this.notificationService.success(`${Math.abs(input.points)} points ${operation} successfully`);
                
                this.cancelAdjust();
                this.loadCustomerPoints();
                this.loadTransactionHistory();
            },
            error: (error) => {
                console.error('Failed to adjust customer points:', error);
                const errorMessage = error?.message || error?.graphQLErrors?.[0]?.message || 'Failed to adjust customer points';
                this.notificationService.error(errorMessage);
                this.adjusting = false;
                this.changeDetector.markForCheck();
            }
        });
    }

    cancelAdjust() {
        this.showAdjustModal = false;
        this.adjusting = false;
        this.adjustForm.reset({
            points: 0,
            description: 'Manual adjustment'
        });
    }

    getReservedPoints(): number {
        if (!this.customerPoints) return 0;
        return (this.customerPoints.balance || 0) - (this.customerPoints.availablePoints || 0);
    }

    getTransactionTypeBadgeClass(type: string): string {
        switch (type) {
            case 'EARNED':
                return 'badge-success';
            case 'REDEEMED':
                return 'badge-warning';
            case 'ADJUSTED':
                return 'badge-info';
            case 'RELEASED':
                return 'badge-secondary';
            case 'REFUNDED':
                return 'badge-primary';
            case 'REMOVED':
                return 'badge-danger';
            default:
                return 'badge-light';
        }
    }
}