import { BaseEntity } from './BaseEntity';
import { QlikApp } from './Tenant';
import { UserMetadata } from './UserMetadata';

export interface Dataset extends BaseEntity, UserMetadata {
    appUserId?: string;
    qlikAppId?: string;
    qlikApp?: QlikApp;
    title?: string;
    description?: string;
    dimensions?: string;
    measures?: string;
    visualizations?: string;
    filters?: string;
    label?: string;
    type?: string;
    tags?: string;
    color?: string;
}

export interface ChartType {
    name?: string;
    isBaseChart?: boolean;
    properties?: any;
    mark?: 'changeName' | 'remove' | 'create';
    markParam?: string;
}
