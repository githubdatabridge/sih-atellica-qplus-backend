import { BaseEntity } from './BaseEntity';

export interface UserBookmark extends BaseEntity {
    appUserId?: string;
    bookmarkId?: number;
}
