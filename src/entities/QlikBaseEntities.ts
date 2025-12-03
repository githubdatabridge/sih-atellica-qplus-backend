export interface QlikUserInfo {
    userDirectory: string;
    userId: string;
    attributes?: any[];
    id?: string;
    name?: string;
    privileges?: any;
    customProperty?: any;
}

export interface QlikInfo {
    host: string;
    qpsPort?: number;
    qrsPort?: number;
    qixPort?: number;
    vp?: string;
    ssl?: boolean;
    app?: string;
}

export interface QlikBaseRequest {
    userInfo: QlikUserInfo;
    qsInfo: QlikInfo;
}
