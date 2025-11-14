import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    DataService,
    NotificationService,
    LanguageCode,
} from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const GET_REWARD_POINTS_SETTINGS = gql`
    query GetRewardPointSettings {
        rewardPointSettings {
            id
            enabled
            earnRate
            redeemRate
            minRedeemAmount
            maxRedeemPerOrder
        }
    }
`;

const UPDATE_REWARD_POINTS_SETTINGS = gql`
    mutation UpdateRewardPointSettings($input: UpdateRewardPointSettingsInput!) {
        updateRewardPointSettings(input: $input) {
            id
            enabled
            earnRate
            redeemRate
            minRedeemAmount
            maxRedeemPerOrder
        }
    }
`;

const GET_CUSTOMER_REWARD_POINTS_SUMMARY = gql`
    query GetCustomerRewardPointsSummary {
        allCustomerRewardPoints(options: { take: 1 }) {
            totalItems
        }
    }
`;

@Component({
    selector: 'reward-points-settings',
    templateUrl: './reward-points-settings.component.html',
    styleUrls: ['./reward-points-settings.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class RewardPointsSettingsComponent implements OnInit {
    settingsForm: FormGroup;
    settings: any;
    customerCount$: Observable<number>;
    
    constructor(
        private formBuilder: FormBuilder,
        private dataService: DataService,
        private notificationService: NotificationService,
        private changeDetector: ChangeDetectorRef,
    ) {
        this.settingsForm = this.formBuilder.group({
            enabled: [false],
            earnRate: [1.0, [Validators.required, Validators.min(0.001)]],
            redeemRate: [0.01, [Validators.required, Validators.min(0.001)]],
            minRedeemAmount: [100, [Validators.required, Validators.min(1)]],
            maxRedeemPerOrder: [10000, [Validators.required, Validators.min(1)]],
        });
    }

    ngOnInit() {
        this.loadSettings();
        this.loadCustomerSummary();
    }

    private loadSettings() {
        this.dataService.query(GET_REWARD_POINTS_SETTINGS).stream$.subscribe({
            next: (result: any) => {
                console.log('GraphQL query response:', result);
                this.settings = result.rewardPointSettings || result.data?.rewardPointSettings;
                if (this.settings) {
                    this.settingsForm.patchValue({
                        enabled: this.settings.enabled,
                        earnRate: this.settings.earnRate,
                        redeemRate: this.settings.redeemRate,
                        minRedeemAmount: this.settings.minRedeemAmount,
                        maxRedeemPerOrder: this.settings.maxRedeemPerOrder,
                    });
                }
                this.changeDetector.markForCheck();
            },
            error: (error) => {
                this.notificationService.error('Failed to load reward points settings');
                console.error('Failed to load reward points settings:', error);
            }
        });
    }

    private loadCustomerSummary() {
        this.customerCount$ = this.dataService.query(GET_CUSTOMER_REWARD_POINTS_SUMMARY).stream$.pipe(
            map((result: any) => {
                console.log('Customer count query response:', result);
                return result.allCustomerRewardPoints?.totalItems || result.data?.allCustomerRewardPoints?.totalItems || 0;
            })
        );
    }

    saveSettings() {
        if (this.settingsForm.valid && this.settingsForm.dirty) {
            const input = this.settingsForm.value;
            
            this.dataService.mutate(UPDATE_REWARD_POINTS_SETTINGS, { input }).subscribe({
                next: (result: any) => {
                    console.log('GraphQL mutation response:', result);
                    if (result.updateRewardPointSettings) {
                        this.settings = result.updateRewardPointSettings;
                        this.settingsForm.markAsPristine();
                        this.notificationService.success('Reward points settings updated successfully');
                        this.changeDetector.markForCheck();
                    } else {
                        console.error('Unexpected response structure:', result);
                        this.notificationService.error('Failed to update settings - unexpected response');
                    }
                },
                error: (error) => {
                    this.notificationService.error('Failed to update reward points settings');
                    console.error('Failed to update reward points settings:', error);
                }
            });
        }
    }

    resetForm() {
        if (this.settings) {
            this.settingsForm.patchValue({
                enabled: this.settings.enabled,
                earnRate: this.settings.earnRate,
                redeemRate: this.settings.redeemRate,
                minRedeemAmount: this.settings.minRedeemAmount,
                maxRedeemPerOrder: this.settings.maxRedeemPerOrder,
            });
            this.settingsForm.markAsPristine();
        }
    }

    calculateExampleEarning(): number {
        const earnRate = this.settingsForm.get('earnRate')?.value || 1.0;
        return Math.round(100 * earnRate); // Points earned for $100 order
    }

    calculateExampleRedemption(): number {
        const redeemRate = this.settingsForm.get('redeemRate')?.value || 0.01;
        return Math.round(1000 * redeemRate * 100) / 100; // Dollar value of 1000 points
    }

    onEarnRateChange() {
        // Validate that earn rate makes sense with redeem rate
        const earnRate = this.settingsForm.get('earnRate')?.value;
        const redeemRate = this.settingsForm.get('redeemRate')?.value;
        
        if (earnRate && redeemRate && (earnRate * redeemRate) > 1) {
            this.notificationService.warning(_('reward-points.warning.high-rate-combination'));
        }
    }

    onMinRedeemAmountChange() {
        // Validate that min is not greater than max
        const minAmount = this.settingsForm.get('minRedeemAmount')?.value;
        const maxAmount = this.settingsForm.get('maxRedeemPerOrder')?.value;
        
        if (minAmount && maxAmount && minAmount > maxAmount) {
            this.settingsForm.get('maxRedeemPerOrder')?.setValue(minAmount);
            this.notificationService.info(_('reward-points.info.max-adjusted-to-min'));
        }
    }

    onMaxRedeemAmountChange() {
        // Validate that max is not less than min
        const minAmount = this.settingsForm.get('minRedeemAmount')?.value;
        const maxAmount = this.settingsForm.get('maxRedeemPerOrder')?.value;
        
        if (minAmount && maxAmount && maxAmount < minAmount) {
            this.settingsForm.get('minRedeemAmount')?.setValue(maxAmount);
            this.notificationService.info(_('reward-points.info.min-adjusted-to-max'));
        }
    }
}