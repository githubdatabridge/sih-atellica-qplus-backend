import 'reflect-metadata';
import {
    Action,
    ActionType,
    Comment,
    CommentType,
    NotificationType,
} from '../../../entities';
import { Notification } from '../../../entities';
import { injectable } from 'tsyringe';
import { QlikAuthData } from '../../../lib/qlik-auth';
import { Errors } from '../../../lib';
import { ReportRepository } from '../../../repositories';
import { getCommentType, parsTextFromComment } from '../../../lib/util';
import { AppUser } from '../../../entities/AppUser';
import { IOnCommentHandle, NotificationError } from '../NotifyOnCommentService';

@injectable()
export class OnCommentCreated implements IOnCommentHandle {
    constructor(private reportRepository?: ReportRepository) {}
    type: ActionType = ActionType.UserCommentCreated;

    async handle(
        userData: QlikAuthData,
        comment: Comment,
        users: AppUser[]
    ): Promise<{
        notifications: Notification[];
        actions: Action[];
        error: NotificationError;
    }> {
        const type = getCommentType(comment);
        try {
            switch (type) {
                case CommentType.Report:
                    var { actions, notifications } =
                        await this.notifyOnCommentOnReportCreated(
                            userData,
                            comment
                        );
                    return { actions, notifications, error: null };

                case CommentType.Visualization:
                    var { actions, notifications } =
                        await this.notifyOnCommentOnVisualizationCreated(
                            userData,
                            comment
                        );
                    return { actions, notifications, error: null };

                default:
                    throw new Errors.InternalError(
                        'Failed to create action on created comment.',
                        {
                            method: 'notifyOnCommentCreated',
                            customerId: userData.customerId,
                            tenantId: userData.tenantId,
                            appId: userData.appId,
                            commentId: comment.id,
                        }
                    );
            }
        } catch (e) {
            return {
                actions: null,
                notifications: null,
                error: {
                    error: e,
                    message: `Comment Notification (Commenting ${type}) cannot be issued`,
                },
            };
        }
    }

    async notifyOnCommentOnVisualizationCreated(
        userData: QlikAuthData,
        comment: Comment
    ): Promise<{ actions: Action[]; notifications: Notification[] }> {
        throw new Errors.InternalError(
            'Comment Notification (Create on Visualization) not implemented',
            {
                method: 'notifyOnCommentOnVisualizationCreated',
            }
        );
    }

    async notifyOnCommentOnReportCreated(
        userData: QlikAuthData,
        comment: Comment
    ): Promise<{ actions: Action[]; notifications: Notification[] }> {
        const commentType = getCommentType(comment);
        const IdsToSkip = [userData.user.appUserId];
        if (comment.parentComment) {
            IdsToSkip.push(comment.parentComment.appUserId);
        }

        const appUserIds = await this.reportRepository.GetAllFollowersOfReport(
            userData.customerId,
            userData.tenantId,
            userData.appId,
            comment.reportId,
            IdsToSkip
        );

        if (!comment.report) {
            comment.report = await this.reportRepository.findByID(
                comment.reportId
            );
        }

        const actions = appUserIds.map((appUserId) => {
            return {
                appUserId: appUserId,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                commentId: comment.id,
                type: ActionType.UserCommentCreated,
            };
        });

        const notification = await this.composeNotificationForComment(
            appUserIds,
            userData,
            comment,
            commentType
        );

        const notifications = notification.appUserIds.map((id) => {
            return {
                ...notification,
                appUserIds: [id],
            };
        });

        return { actions: actions, notifications: notifications };
    }

    private async composeDataForComment(
        userData: QlikAuthData,
        comment: Comment,
        commentType: CommentType
    ): Promise<any> {
        const result = {
            initials: userData.user.name[0],
            firstName: userData.user.name,
            content: parsTextFromComment(comment),
            pageId:
                commentType == CommentType.Report
                    ? comment.report.pageId
                    : comment.visualization.pageId,
            commentId: comment.id,
            user: {
                name: userData.user.name,
                appUserId: userData.user.appUserId,
                email: userData.email,
            },
            email: userData.email,
        };

        if (commentType === CommentType.Report) {
            result['report_title'] = comment.report.title;
        }

        return result;
    }

    private async composeNotificationForComment(
        appUserIds: string[],
        userData: QlikAuthData,
        comment: Comment,
        commentType: CommentType
    ): Promise<Notification> {
        const data = await this.composeDataForComment(
            userData,
            comment,
            commentType
        );
        data[`${commentType}Id`] = comment[`${commentType}Id`];

        return {
            type: NotificationType.UserCommentCreated,
            appUserIds: appUserIds,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
            data,
        };
    }
}
