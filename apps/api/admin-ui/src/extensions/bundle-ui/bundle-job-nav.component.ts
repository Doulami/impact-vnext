import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DataService, NotificationService } from '@vendure/admin-ui/core';
import { gql } from 'apollo-angular';

/**
 * Bundle Job Navigation Component
 * 
 * Phase 4.3 Implementation - Bundle Plugin v2
 * 
 * Simple component that provides quick access to bundle job management.
 * Since jobs are visible in Vendure's native System → Jobs page,
 * this component provides shortcuts and manual triggers.
 */

@Component({
    selector: 'bundle-job-nav',
    template: `
        <div class="bundle-job-nav">
            <h4>Bundle Job Management</h4>
            <p class="info">
                Bundle jobs are processed in the background and visible in 
                <a (click)="navigateToJobs()">System → Jobs</a>
            </p>
            
            <div class="job-actions">
                <button 
                    class="btn btn-secondary btn-sm"
                    (click)="navigateToJobs()">
                    <clr-icon shape="tasks"></clr-icon>
                    View All Jobs
                </button>
                
                <button 
                    class="btn btn-outline btn-sm"
                    (click)="triggerConsistencyCheck()">
                    <clr-icon shape="refresh"></clr-icon>
                    Consistency Check
                </button>
                
                <button 
                    class="btn btn-outline btn-sm"
                    (click)="emergencyCheck()"
                    title="Emergency check for broken bundles">
                    <clr-icon shape="exclamation-triangle"></clr-icon>
                    Emergency Check
                </button>
            </div>
        </div>
    `,
    styles: [`
        .bundle-job-nav {
            border: 1px solid var(--color-grey-300);
            border-radius: 4px;
            padding: 1rem;
            margin: 1rem 0;
            background: var(--color-grey-50);
        }
        
        .bundle-job-nav h4 {
            margin: 0 0 0.5rem 0;
            font-size: 1rem;
        }
        
        .info {
            margin: 0 0 1rem 0;
            font-size: 0.875rem;
            color: var(--color-grey-600);
        }
        
        .info a {
            color: var(--color-primary-500);
            text-decoration: underline;
            cursor: pointer;
        }
        
        .job-actions {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        
        .btn-sm {
            font-size: 0.875rem;
            padding: 0.25rem 0.5rem;
        }
    `]
})
export class BundleJobNavComponent {
    
    constructor(
        private router: Router,
        private dataService: DataService,
        private notificationService: NotificationService
    ) {}
    
    navigateToJobs() {
        // Navigate to System → Jobs page
        this.router.navigate(['/system', 'jobs']);
    }
    
    async triggerConsistencyCheck() {
        try {
            const result = await this.dataService.mutate(TRIGGER_CONSISTENCY_CHECK, { 
                scope: 'active' 
            }).toPromise();
            
            this.notificationService.success(
                `${result.triggerBundleConsistencyCheck.message} Job ID: ${result.triggerBundleConsistencyCheck.jobId.substring(0, 8)}...`
            );
            
        } catch (error) {
            this.notificationService.error('Failed to trigger consistency check');
        }
    }
    
    async emergencyCheck() {
        if (!confirm('This will run an emergency consistency check on broken bundles. Continue?')) {
            return;
        }
        
        try {
            const result = await this.dataService.mutate(EMERGENCY_CONSISTENCY_CHECK, { 
                scope: 'broken' 
            }).toPromise();
            
            this.notificationService.warning(
                `${result.emergencyBundleConsistencyCheck.message} Job ID: ${result.emergencyBundleConsistencyCheck.jobId.substring(0, 8)}...`
            );
            
        } catch (error) {
            this.notificationService.error('Failed to trigger emergency check');
        }
    }
}

// GraphQL mutations
const TRIGGER_CONSISTENCY_CHECK = gql\`
    mutation TriggerConsistencyCheck($scope: String) {
        triggerBundleConsistencyCheck(scope: $scope) {
            jobId
            message
        }
    }
\`;

const EMERGENCY_CONSISTENCY_CHECK = gql\`
    mutation EmergencyConsistencyCheck($scope: String) {
        emergencyBundleConsistencyCheck(scope: $scope) {
            jobId
            message
        }
    }
\`;