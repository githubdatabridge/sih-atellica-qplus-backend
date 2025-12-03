import { QlikState } from './QlikState';
import { BaseEntity } from './BaseEntity';
import { Reaction, Report, Visualization } from '.';
import { AppUser } from './AppUser';
import { UserMetadata } from './UserMetadata';

export interface Comment extends BaseEntity, UserMetadata {
    content?: string;
    appUserId?: string;
    qlikStateId?: number;
    scope?: string;
    commentId?: number;
    visualizationId?: number;
    reportId?: number;
    comments?: Comment[];
    qlikState?: QlikState;
    user?: AppUser;
    parentComment?: Comment;
    reactions?: Reaction[];
    visualization?: Visualization;
    report?: Report;
}

export enum CommentType {
    Report = 'report',
    Visualization = 'visualization',
}
