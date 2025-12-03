import { BaseEntity } from './BaseEntity';

export interface QlikJob extends BaseEntity {
    id?: number;
    customerId?: number;
    userId?: number;
    qlikAppId?: number;
    appUserId?: string;
    qsTaskExecutionGuid?: string;
    status?: QlikJobStatus;
    callback?: string;
    callbackTries?: number;
    isOnboarding?: boolean;
    isFullLoad?: boolean;
    viewedAt?: boolean;
}

export interface QlikJobRequest extends BaseEntity {
    extId?: string;
    customerId?: number;
    userId?: number;
    qlikAppId?: number;
    appUserId?: string;
    qsAppGuid?: string;
    qsEtlAppGuid?: string;
    qsTaskGuid?: string;
    qsTaskExecutionGuid?: string;
    status?: QlikJobStatus;
    callback?: string;
    isOnboarding?: boolean;
    isFullLoad?: boolean;
    qsUserDirectory?: string;
    qsUserId?: string;
    qsHost?: string;
    qsPort?: number;
}
export interface QlikJobPatchRequest extends BaseEntity {
    extId?: string;
    userId?: number;
    appUserId?: string;
    viewedAt?: Date;
}
export interface QlikJobResponse extends BaseEntity {
    qsTaskGuid: string;
    qsTaskExecutionGuid: string;
    status: QlikJobStatus;
    qsAppFileSize?: number;
    qsLastReloadDate?: Date;
}

export enum QlikJobStatus {
    QUEUED = 'queued',
    PENDING = 'pending',
    CREATED = 'created',
    FAILED = 'failed',
    SUCCESS = 'success',
}
