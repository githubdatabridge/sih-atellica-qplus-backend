import { BaseEntity } from './BaseEntity';
import { UserMetadata } from './UserMetadata';

export interface Feedback extends BaseEntity, UserMetadata {
    appUserId?: string;
    rating?: number;
    comment?: string;
}
