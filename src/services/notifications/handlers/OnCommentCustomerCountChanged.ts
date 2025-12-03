import {
    Action,
    Comment,
    CommentType,
    NotificationType,
} from '../../../entities';
import { Notification } from '../../../entities';
import { injectable } from 'tsyringe';
import { QlikAuthData } from '../../../lib/qlik-auth';
import { CommentRepository } from '../../../repositories';
import { getCommentType } from '../../../lib/util';
import { IOnCommentHandle, NotificationError } from '../NotifyOnCommentService';

@injectable()
export class OnCommentCustomerCountChanged implements IOnCommentHandle {
    constructor(private commentRepository?: CommentRepository) {}
    type = NotificationType.CustomerCommentCountChanged;

    async handle(
        userData: QlikAuthData,
        comment: Comment
    ): Promise<{
        notifications: Notification[];
        actions: Action[];
        error: NotificationError;
    }> {
        const type = getCommentType(comment);

        if (type === CommentType.Report) {
            return {
                actions: [],
                notifications: [],
                error: null,
            };
        }
        try {
            const commentWhere: Comment = {
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
            };

            commentWhere[type + 'Id'] = comment[type + 'Id'];

            const count = await this.commentRepository.getCount(commentWhere);

            const data = { count: count || 0 };
            data[type + 'Id'] = comment[type + 'Id'];

            const notification: Notification = {
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserIds: [userData.user.appUserId],
                type: NotificationType.CustomerCommentCountChanged,
                data,
            };

            return {
                actions: [],
                notifications: [notification],
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
