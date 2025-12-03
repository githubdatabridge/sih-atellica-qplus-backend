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
import { CommentRepository } from '../../../repositories';
import { getCommentType, parsTextFromComment } from '../../../lib/util';
import { AppUser } from '../../../entities/AppUser';
import { IOnCommentHandle, NotificationError } from '../NotifyOnCommentService';

@injectable()
export class OnCommentReplied implements IOnCommentHandle {
    constructor(private commentRepository?: CommentRepository) {}
    type: ActionType = ActionType.UserCommentReplied;

    async handle(
        userData: QlikAuthData,
        comment: Comment,
        users: AppUser[]
    ): Promise<{
        notifications: Notification[];
        actions: Action[];
        error: NotificationError;
    }> {
        try {
            const actions = [];
            const notifications = [];

            if (comment.commentId) {
                const commentType = getCommentType(comment);
                const parentComment = await this.commentRepository.findByID(
                    comment.commentId
                );

                if (!parentComment) {
                    return;
                }

                const parentCommentOwners = users.filter(
                    (u) => u.appUserId === parentComment.appUserId
                );

                if (!parentCommentOwners || !parentCommentOwners.length) {
                    return;
                }

                const parentCommentOwner = parentCommentOwners[0];

                const dataForNotify = this.composeNotificationDataForReply(
                    comment,
                    parentComment,
                    commentType,
                    parentCommentOwner,
                    userData
                );

                const notification: Notification = {
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserIds: [parentComment.appUserId],
                    type: NotificationType.UserCommentReplied,
                    data: dataForNotify,
                };

                const action = {
                    appUserId: parentComment.appUserId,
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    commentId: comment.id,
                    type: ActionType.UserCommentReplied,
                };

                actions.push(action);
                notifications.push(notification);
            }

            return {
                actions,
                notifications,
                error: null,
            };
        } catch (e) {
            return {
                actions: null,
                notifications: null,
                error: {
                    error: e,
                    message: 'Comment Notification (Reply) cannot be issued',
                },
            };
        }
    }

    private composeNotificationDataForReply(
        comment: Comment,
        parentComment: Comment,
        commentType: CommentType,
        parentCommentOwner: AppUser,
        userData: QlikAuthData
    ) {
        const text = parsTextFromComment(comment);
        const dataForNotify = {
            commentId: comment.id,
            replyCommentId: parentComment.id,
            firstName: parentCommentOwner.name,
            repliedBy: `${userData.user.name}`,
            content: text,
            initials: userData.user.name.trim().substring(0, 1).toUpperCase(),
            user: {
                name: userData.user.name,
                appUserId: userData.user.appUserId,
                email: userData.email,
            },
            email: parentCommentOwner.email,
        };
        dataForNotify[commentType + 'Id'] = comment[commentType + 'Id'];
        return dataForNotify;
    }
}
