import { QlikBaseRequest, QlikInfo, QlikUserInfo } from './QlikBaseEntities';

// export interface QlikApp extends BaseEntity {
//     userId?: number;
//     customerId?: number;
//     qsAppGuid?: string;
//     qsEtlAppGuid?: string;
//     qsTaskGuid?: string;
//     qsEtlTaskGuid?: string;
//     qsAppFileSize?: number;
//     qsLastReloadDate?: Date;
//     status?: QlikAppStatus;
//     qsUserDirectory?: string;
//     qsUserId?: string;
//     qsHost?: string;
//     qsPort?: number;
// }

export enum QlikAppStatus {
    PENDING = 'pending',
    CREATED = 'created',
    FAILED = 'failed',
    SUCCESS = 'success',
    WARNING = 'warning',
}

export interface QlikAppArchiveRequest extends QlikBaseRequest {
    extId: string;
    qsAppGuid: string;
    qsAppEtlGuid?: string;
    qsArchiveStreamGuid: string;
    simulate?: boolean;
}

export interface QlikAppArchiveResponse {
    extId: string;
    message: string;
    deletedTasksCount: number;
    archivedToStreamId: string;
    removedData: boolean;
    fileSize: number;
}

export interface QlikAppRemoveRequest extends QlikBaseRequest {
    extId: string;
    qsAppGuid: string;
    qsAppEtlGuid?: string;
}
export interface QlikAppRemoveResponse {
    extId: string;
    appIsRemoved: boolean;
}

export interface QlikAppAttachActionRequest {
    file: number[];
    qsInfo: QlikInfo;
    qrsUserInfo: QlikUserInfo;
    fileName: string;
}

export interface QlikAppAttachActionResponse {
    path: string;
}

export interface QlikAppRemoveAttachmentActionRequest {
    qsInfo: QlikInfo;
    qrsUserInfo: QlikUserInfo;
    fileName: string;
}

export interface QlikAppRemoveAttachmentActionResponse {
    result: boolean;
}
