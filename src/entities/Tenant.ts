import { QlikAuthType } from '../services/authProviders/QlikAuthProviderFactory';
export interface Tenant {
    id: string;
    name: string;
    host: string;
    port?: number; // QRS port (default: 4242)
    qpsPort?: number; // QPS port (default: 4243)
    customers: Customer[];
    authType: QlikAuthType;
    idProvider?: IdProvider;
    tokenOptions?: TokenOptions;
    apiKey?: {
        value: string;
    };
}

export interface TokenOptions {
    keyid: string;
    algorithm: string;
}

export interface IdProvider {
    id: number;
    type: 'azure' | 'google' | 'qlikOauth';
    tenantId?: string;
    clientId: string;
    clientSecret: string;
}

export interface Customer {
    id: string;
    name: string;
    apps: MashupApp[];
    spaceId?: string;
}

export interface QlikAppMashupApp {
    mashupApp: MashupApp;
    qlikApp: QlikApp;
}

export interface MashupApp {
    id: string;
    name: string;
    qlikApps: QlikApp[];
    callbackUrl?: string;
}

export interface QlikApp {
    id: string;
    name: string;
}
