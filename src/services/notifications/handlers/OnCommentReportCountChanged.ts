import {
    Action,
    ActionType,
    Comment,
    NotificationType,
} from '../../../entities';
import { Notification } from '../../../entities';
import { injectable } from 'tsyringe';
import { QlikAuthData } from '../../../lib/qlik-auth';
import { CommentRepository, ReportRepository } from '../../../repositories';
import { getCommentType } from '../../../lib/util';
import { IOnCommentHandle, NotificationError } from '../NotifyOnCommentService';

@injectable()
export class OnCommentReportCountChanged implements IOnCommentHandle {
    constructor(
        private commentRepository?: CommentRepository,
        private reportRepository?: ReportRepository
    ) {}
    type = NotificationType.ReportCommentCountChanged;

    async handle(
        userData: QlikAuthData,
        comment: Comment
    ): Promise<{
        notifications: Notification[];
        actions: Action[];
        error: NotificationError;
    }> {
        if (!comment.reportId) {
            return {
                actions: [],
                notifications: [],
                error: null,
            };
        }
        const type = getCommentType(comment);

        try {
            const commentWhere: Comment = {
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                reportId: comment.reportId,
            };

            const count = await this.commentRepository.getCount(commentWhere);

            const data = { count: count || 0 };
            data['reportId'] = comment.reportId;

            const appUserIds =
                await this.reportRepository.GetAllFollowersOfReport(
                    userData.customerId,
                    userData.tenantId,
                    userData.appId,
                    comment.reportId
                );

            const notification: Notification = {
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserIds,
                type: NotificationType.ReportCommentCountChanged,
                data,
            };

            const notifications = notification.appUserIds.map((id) => {
                return {
                    ...notification,
                    appUserIds: [id],
                };
            });

            return {
                actions: [],
                notifications,
                error: null,
            };
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
}
