import { UserMetadata } from './UserMetadata';

export enum NotificationType {
    UserCreatedReactionOnVisualization = 'user.reaction.visualization',
    UserCreatedReactionOnComment = 'user.reaction.comment',
    UserTaggedInComment = 'user.tag.comment',
    UserCommentReplied = 'user.comment.replied',
    UserQlikDataLoaded = 'user.qlik.data.loaded',
    CustomerReactionCountChanged = 'customer.reaction.count.changed',
    CustomerCommentCountChanged = 'customer.comment.count.changed',
    ReportCommentCountChanged = 'report.comment.count.changed',
    CustomerQlikDataLoaded = 'customer.qlik.data.loaded',
    FeedbackCreated = 'user.feedback.created',
    CustomerOnboardingChanged = 'customer.onboarding.changed',
    UserSharedReport = 'user.shared.report',
    SystemReportCreated = 'system.report.created',
    UserCommentCreated = 'user.comment.created',
    UserSharedBookmark = 'user.shared.bookmark',
}

export interface Notification extends UserMetadata {
    type?: NotificationType;
    appUserIds?: string[];
    userId?: number;
    data?: any;
}
