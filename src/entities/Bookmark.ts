import { AppUser } from './AppUser';
import { BaseEntity } from './BaseEntity';
import { QlikState } from './QlikState';

export interface Bookmark extends BaseEntity {
    name?: string;
    tenantId?: string;
    customerId?: string;
    appId?: string;
    isPublic?: boolean;
    meta?:any
    user?: AppUser;
    appUserId?: string;
    path?: string;
    bookmarkItems?: BookmarkItem[];
}

export interface BookmarkItem extends BaseEntity {
    bookmarkId?: number;
    qlikStateId?: number;
    qlikAppId?: string;
    qlikState?: QlikState;
}
