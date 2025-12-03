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
import { getCommentType, parsTextFromComment } from '../../../lib/util';
import { AppUser } from '../../../entities/AppUser';
import { IOnCommentHandle, NotificationError } from '../NotifyOnCommentService';

@injectable()
export class OnCommentTagged implements IOnCommentHandle {
    constructor() {}
    type: ActionType = ActionType.UserTaggedInComment;

    async handle(
        userData: QlikAuthData,
        comment: Comment,
        users: AppUser[]
    ): Promise<{
        notifications: Notification[];
        actions: Action[];
        error: NotificationError;
    }> {
        const actions = [];
        const notifications = [];
        try {
            const commentType = getCommentType(comment);
            const content = JSON.parse(comment.content);

            for (const prop in content.entityMap) {
                if (!content.entityMap.hasOwnProperty(prop)) {
                    continue;
                }

                const eM = content.entityMap[prop];

                if (eM.type !== 'mention') {
                    continue;
                }

                const mentionedUsers = users.filter(
                    (u) => u.appUserId === eM.data.mention.appUserId
                );

                if (
                    !mentionedUsers ||
                    !Array.isArray(mentionedUsers) ||
                    !mentionedUsers[0]
                ) {
                    continue;
                }

                const mentionedUser = mentionedUsers[0];

                const dataForNotify =
                    this.composeNotificationDataForMentionedInComment(
                        comment,
                        commentType,
                        mentionedUser,
                        userData
                    );

                const notification: Notification = {
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserIds: [mentionedUser.appUserId],
                    type: NotificationType.UserTaggedInComment,
                    data: dataForNotify,
                };

                const action = {
                    appUserId: mentionedUser.appUserId,
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    commentId: comment.id,
                    type: ActionType.UserTaggedInComment,
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
                    message: 'Comment Notification (Mention) cannot be issued',
                },
            };
        }
    }

    private composeNotificationDataForMentionedInComment(
        comment: Comment,
        commentType: CommentType,
        mentionedUser: AppUser,
        userData: QlikAuthData
    ) {
        const dataForNotify = {
            commentId: comment.id,
            firstName: mentionedUser.name,
            taggedBy: `${userData.user.name}`,
            content: parsTextFromComment(comment),
            initials: userData.user.name.trim().substring(0, 1).toUpperCase(),
            user: {
                name: userData.user.name,
                appUserId: userData.user.appUserId,
                email: userData.email,
            },
            email: mentionedUser.email,
        };
        dataForNotify[commentType + 'Id'] = comment[commentType + 'Id'];
        return dataForNotify;
    }
}
