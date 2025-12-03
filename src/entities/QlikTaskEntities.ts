import { QlikBaseRequest } from './QlikBaseEntities';
import { QlikJobStatus } from './QlikJobEntities';

export enum QlikTaskStatus {
    NeverStarted = 0,
    Triggered = 1,
    Started = 2,
    Queued = 3,
    AbortInitiated = 4,
    Aborting = 5,
    Aborted = 6,
    FinishedSuccess = 7,
    FinishedFail = 8,
    Skipped = 9,
    Retry = 10,
    Error = 11,
    Reset = 12,
}
export interface QlikTaskStartRequest extends QlikBaseRequest {
    qlikAppGuid?: string;
    qlikTaskGuid: string;
}

export interface QlikTaskStartResponse {
    qlikTaskGuid: string;
    qlikTaskExecutionGuid: string;
}
export interface QlikTaskStatusRequest extends QlikBaseRequest {
    qlikAppGuid?: string;
    qlikTaskGuid: string;
}

export interface QlikTaskStatusResponse {
    qlikTaskGuid: string;
    status?: QlikJobStatus;
    qlikAppFileSize?: number;
    qlikLastReloadDate?: Date;
}
