import { BaseEntity } from './BaseEntity';
import { UserMetadata } from './UserMetadata';

export interface Visualization extends BaseEntity, UserMetadata {
    pageId?: string;
    componentId?: string;
}
