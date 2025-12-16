import { Report } from '.';
import { AppUser } from './AppUser';
import { BaseEntity } from './BaseEntity';
import { Comment } from './Comment';
import { UserMetadata } from './UserMetadata';

export interface Action extends BaseEntity, UserMetadata {
    appUserId?: string;
    commentId?: number;
    viewedAt?: Date;
    reportId?: number;
    report?: Report;
    comment?: Comment;
    user?: AppUser;
    type?: ActionType;
}

export enum ActionKind {
    Comment = 'comment',
    Report = 'report',
}

export enum ActionType {
    UserCommentCreated = 'user.comment.created',
    UserCreatedReactionOnVisualization = 'user.reaction.visualization',
    UserCreatedReactionOnComment = 'user.reaction.comment',
    UserTaggedInComment = 'user.tag.comment',
    UserCommentReplied = 'user.comment.replied',
    UserSharedReport = 'user.shared.report',
    SystemReportCreated = 'system.report.created',
}
