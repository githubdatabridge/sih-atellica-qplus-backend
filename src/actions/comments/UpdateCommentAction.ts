import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { CommentRepository, QlikStateRepository } from '../../repositories';
import { ActionType, Comment } from '../../entities';
import * as Errors from '../../lib/errors';
import {
    CommentService,
    NotifyOnCommentService,
    QlikStateService,
    UserService,
} from '../../services';
import { QlikAuthData } from '../../lib/qlik-auth';

@injectable()
@autoInjectable()
export class UpdateCommentAction extends BaseAction<Comment> {
    constructor(
        private commentRepository?: CommentRepository,
        private qlikStateRepository?: QlikStateRepository,
        private commentService?: CommentService,
        private notifyService?: NotifyOnCommentService,
        private qlikStateService?: QlikStateService,
        private userService?: UserService
    ) {
        super();
    }

    async run(
        id: number,
        data: Comment,
        userData: QlikAuthData
    ): Promise<Comment> {
        const comment = await this.commentRepository.findByID(id);

        if (!comment || comment.appUserId !== userData.user.appUserId) {
            throw new Errors.NotFoundError('Comment not found', {
                method: 'UpdateComment',
                commentId: comment.id,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserId: userData.user.appUserId,
            });
        }

        if (data.qlikState) {
            const newQlikState = this.qlikStateService.handleTextFields(data.qlikState);
            const qlikState = await this.qlikStateRepository.create(
                newQlikState
            );

            if (!qlikState) {
                throw new Errors.InternalError('qlikState creation failed', {
                    method: 'UpdateComment',
                    commentId: comment.id,
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    appUserId: userData.user.appUserId,
                });
            }

            data.qlikStateId = qlikState.id;

            if (comment.qlikStateId) {
                await this.qlikStateRepository.deleteWhere({
                    id: comment.qlikState.id,
                });
            }
        }

        if (data.qlikState === null && comment.qlikStateId) {
            await this.qlikStateRepository.deleteWhere({
                id: comment.qlikStateId,
            });

            data.qlikStateId = null;
        }

        delete data.qlikState;

        let updatedComment = await this.commentRepository.updateWhere(
            {
                id,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
            },
            data,
            true
        );

        const users = await this.userService.getAllUsersInfo(userData);

        updatedComment = await this.commentService.PrepareComment(
            updatedComment,
            userData,
            users
        );

        if (data.content && data.content !== comment.content) {
            this.notifyService.defineHandlers(
                [ActionType.UserTaggedInComment],
                []
            );

            await this.notifyService.process(userData, updatedComment, users);
        }

        return updatedComment;
    }
}
