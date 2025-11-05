import { Injector } from '@angular/core';
import { ApolloLink } from '@apollo/client/core';
import { JobQueueService } from '../providers/job-queue/job-queue.service';
/**
 * This link checks each operation and if it is a mutation, it tells the JobQueueService
 * to poll for active jobs. This is because certain mutations trigger background jobs
 * which should be made known in the UI.
 */
export declare class CheckJobsLink extends ApolloLink {
    private injector;
    private _jobQueueService;
    get jobQueueService(): JobQueueService;
    /**
     * We inject the Injector rather than the JobQueueService directly in order
     * to avoid a circular dependency error.
     */
    constructor(injector: Injector);
    private isMutation;
}
