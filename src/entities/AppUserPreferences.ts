import { BaseEntity } from './BaseEntity';
import { UserMetadata } from './UserMetadata';

export interface AppUserPreferences extends BaseEntity, UserMetadata {
    chatbot?: boolean;
    forecast?: boolean;
    socialBar?: boolean;
    notifications?: boolean;
    themeMain?: string;
    language?: 'EN' | 'DE' | 'IT' | 'FR';
    additionalPreferences?: string | object;
    appUserId?: string;
}
