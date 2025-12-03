import { QlikUserInfo, QlikInfo } from './QlikBaseEntities';
import { QlikCookie } from './QlikCookieEntities';

export interface QlikUserActionRequest {
    qsInfo: QlikInfo;
    userInfo: QlikUserInfo;
    removeUserInfo: QlikUserInfo;
    simulate?: boolean;
}

export interface QlikUserActionResponse {
    message: string;
    totalCount: number;
    counterAnalyzer: number;
    counterProfessional: number;
}

export interface QlikUserAuthRequest {
    qsInfo: QlikInfo;
    userInfo: QlikUserInfo;
    qrsInfo?: QlikInfo;
    qrsUserInfo?: QlikUserInfo;
    cookie?: QlikCookie;
}

export interface QlikActionRequestCustomProperty {
    key?: string;
    name?: string;
    values?: string[];
}

export interface QlikActionRequest {
    qsInfo: QlikInfo;
    customProperties?: QlikActionRequestCustomProperty[];
    roles?: string[];
}

export interface QlikUserAuthResponse {
    sessionId: string;
}

export interface QlikUserSyncRequest {
    qsInfo: QlikInfo;
    qrsInfo?: QlikInfo;
    qrsUserInfo?: QlikUserInfo;
    userInfo: QlikUserInfo;
}

type CustomPropertyDefinition = {
    id: string;
    name: string;
    valueType: string;
    choiceValues: string[];
    privileges: any;
};

type CustomProperty = {
    id: string;
    createdDate: Date;
    modifiedDate: Date;
    modifiedByUserName: string;
    value: string;
    definition: CustomPropertyDefinition;
    schemaPath: string;
    key?: string;
    name?: string;
    values?: string[];
};

// export interface QlikUser {
//     id: string;
//     createdDate: Date;
//     modifiedDate: Date;
//     modifiedByUserName: string;
//     customProperties?: CustomProperty[];
//     userId: string;
//     userDirectory: string;
//     userDirectoryConnectorName?: string;
//     name: string;
//     roles?: string[];
//     attributes: any[];
//     inactive: boolean;
//     removedExternally: boolean;
//     blacklisted: boolean;
//     deleteProhibited: boolean;
//     tags: string[];
//     privileges?: any;
//     schemaPath?: string;
//     email?: string;
// }

export interface QlikUser {
    id: string;
    name: string;
    roles?: string[];
    email?: string;
}
export interface QlikQesUser extends QlikUser {
    createdDate: Date;
    modifiedDate: Date;
    userId: string;
    userDirectory: string;
    userDirectoryConnectorName?: string;
    modifiedByUserName: string;
    customProperties?: CustomProperty[];
    attributes: any[];
    inactive: boolean;
    removedExternally: boolean;
    blacklisted: boolean;
    deleteProhibited: boolean;
    tags: string[];
    privileges?: any;
    schemaPath?: string;
}

export interface QlikQsaasUser extends QlikUser {
    status: string;
}
