import { QlikBaseRequest } from './QlikBaseEntities';

export interface QlikUIntegrationRemoveActionRequest extends QlikBaseRequest {
    extId: string;
    qsCustomPropGuid: string;
}

export interface QlikUIntegrationRemoveActionResponse {
    success: boolean;
}

export interface QlikIntegrationCreateRequest extends QlikBaseRequest {
    extId: string;
    qsProjectName?: string;
    qsStreamGuid: string;
    qsStreamEtlGuid: string;
    qsSourceEtlAppGuid: string;
    qsSourceAppGuid: string;
    qsCustomPropGuid: string;
    qsTaskCompositeEvents?: any;
    qsTaskSchemaEvents?: any;
}

export interface QlikIntegrationCreateResponse {
    extId: string;
    status: string;
    qsAppGuid: string;
    qsTaskGuid: string;
    qsEtlAppGuid?: string;
    qsEtlTaskGuid?: string;
}
