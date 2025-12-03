import { BaseEntity } from './BaseEntity';
import { UserMetadata } from './UserMetadata';

export interface UserReport extends BaseEntity, UserMetadata {
    appUserId?: string;
    reportId?: number;
}
