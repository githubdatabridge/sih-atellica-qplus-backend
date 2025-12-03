export interface QsaasConfiguration {
    host: string;
    tenantId: string;
    apiKey: string;
}

export interface QsaasUserLight {
    id: string;
    status: 'active' | 'invited' | 'disabled' | 'deleted';
    name: string;
    email: string;
    roles: string[];
    space?: QsaasSpace;
}

export interface QsaasSpace {
    id: string;
    roles: string[];
    type: string;
    tenantId: string;
}
