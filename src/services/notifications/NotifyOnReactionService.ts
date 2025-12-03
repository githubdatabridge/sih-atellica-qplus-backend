import {
    CommentRepository,
    ReactionRepository,
    VisualizationRepository,
} from '../../repositories';
import { UserService } from '..';
import { injectable } from 'tsyringe';
import { ActionService } from '../ActionService';
import {
    ActionType,
    Comment,
    Notification,
    NotificationType,
    Reaction,
    sentiments,
    Visualization,
} from '../../entities';
import { NotifyService } from './NotifyService';
import { QlikAuthData } from '../../lib/qlik-auth';
import { Errors } from '../../lib';
import { AppUser } from '../../entities/AppUser';

@injectable()
export class NotifyOnReactionService extends NotifyService {
    constructor(
        private reactionRepository?: ReactionRepository,
        private actionService?: ActionService,
        private commentRepository?: CommentRepository,
        private visualizationRepository?: VisualizationRepository,
        private userService?: UserService
    ) {
        super();
    }

    async notifyReactionCountChanged(
        appUserId: string,
        customerId: string,
        tenantId: string,
        appId: string,
        visualizationId: number
    ) {
        if (!visualizationId) {
            return;
        }

        const count = await this.reactionRepository.getCount({
            visualizationId,
            customerId,
            tenantId,
            appId,
        });

        const notification: Notification = {
            customerId,
            tenantId,
            appId,
            appUserIds: [appUserId],
            type: NotificationType.CustomerReactionCountChanged,
            data: {
                visualizationId: visualizationId,
                count: count || 0,
            },
        };

        this.Send(notification);
    }

    async notifyReactionCreated(userData: QlikAuthData, data: Reaction) {
        try {
            if (data.commentId) {
                const type = 'comment';

                const comment = await this.commentRepository.findByID(
                    data.commentId
                );

                if (!comment) {
                    return;
                }

                const commentOwners = await this.userService.getUsersInfo(
                    [comment.appUserId],
                    userData,
                    null
                );

                if (
                    !commentOwners ||
                    !Array.isArray(commentOwners) ||
                    !commentOwners[0] ||
                    commentOwners[0].appUserId === userData.user.appUserId
                ) {
                    return;
                }

                const commentOwner = commentOwners[0];

                const action = await this.actionService.CreateActionOnComments(
                    userData,
                    data.commentId,
                    commentOwner.appUserId,
                    ActionType.UserCreatedReactionOnComment
                );

                if (!action) {
                    throw new Errors.InternalError(
                        'Failed to create action on Mentioned comment.',
                        {
                            method: 'notifyReactionCreated',
                            customerId: userData.customerId,
                            tenantId: userData.tenantId,
                            appId: userData.appId,
                            commentId: data.id,
                        }
                    );
                }

                const notification =
                    this.composeNotificationDataForReactionOnComment(
                        userData,
                        comment,
                        type,
                        data,
                        commentOwner
                    );

                this.Send(notification);
            } else if (data.visualizationId) {
                const type = 'visualization';

                const visualization =
                    await this.visualizationRepository.findByID(
                        data.visualizationId
                    );

                if (!visualization) {
                    return;
                }

                const users = await this.userService.getAllUsersInfo(userData);

                if (!users || !users.length) {
                    return;
                }

                users.forEach((user) => {
                    const not =
                        this.composeNotificationDataForReactionOnVisualization(
                            userData,
                            user,
                            type,
                            visualization,
                            data
                        );

                    this.Send(not);
                });
            }
        } catch (e) {
            this.handleError(e, 'Reaction Notification cannot be issued');
        }
    }

    private composeNotificationDataForReactionOnComment(
        userData: QlikAuthData,
        comment: Comment,
        type: string,
        data: Reaction,
        commentOwner: AppUser
    ) {
        return {
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
            appUserIds: [comment.appUserId],
            type: NotificationType.UserCreatedReactionOnComment,
            data: {
                type,
                commentId: comment.id,
                reactionId: data.id,
                reactedBy: `${userData.user.name}`,
                firstName: commentOwner.name,
                sentiment:
                    sentiments.find((s) => s.score === data.score).label || '',
                initials: commentOwner.name
                    .trim()
                    .substring(0, 1)
                    .toUpperCase(),
                email: commentOwner.email,
                user: {
                    name: userData.user.name,
                    appUserId: userData.user.appUserId,
                    email: userData.email,
                },
            },
        };
    }

    private composeNotificationDataForReactionOnVisualization(
        userData: QlikAuthData,
        user: AppUser,
        type: string,
        visualization: Visualization,
        data: Reaction
    ) {
        return {
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
            appUserIds: [user.appUserId],
            type: NotificationType.UserCreatedReactionOnVisualization,
            data: {
                firstName: user.name,
                type,
                visualizationId: visualization.id,
                reactionId: data.id,
                reactedBy: `${userData.user.name}`,
                sentiment:
                    sentiments.find((s) => s.score === data.score).label || '',
                email: user.email,
                user: {
                    name: userData.user.name,
                    appUserId: userData.user.appUserId,
                    email: userData.email,
                },
            },
        };
    }
}
