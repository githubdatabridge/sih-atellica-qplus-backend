import { BaseEntity } from './BaseEntity';
import { UserMetadata } from './UserMetadata';

export interface PinWall extends BaseEntity, UserMetadata {
    id?: number;
    title?: string;
    description?: string;
    content?: string;
    appUserId?: string;
    isFavourite?: boolean;
    qlikState?: any;
}
export interface PinWallContent {
    cellCount?: number;
    cells?: [
        {
            visualizationId?: string;
            reportId?: number;
            width?: number;
            height?: number;
            x?: number;
            y?: number;
        },
    ];
}
