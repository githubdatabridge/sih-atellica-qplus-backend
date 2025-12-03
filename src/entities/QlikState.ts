import { BaseEntity } from './BaseEntity';

export interface QlikState extends BaseEntity {
    qsBookmarkId?: string;
    qsSelectionHash?: number;
    selections?: any;
    meta?: any;
}
