import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { Comment } from '../../entities';
import { QlikAuthData } from '../../lib/qlik-auth';
import { CommentRepository } from '../../repositories';
import { CommentService, UserService } from '../../services';
import { Errors } from '../../lib';
import { RepositoryResponse } from '../../repositories/BaseRepository';

@injectable()
@autoInjectable()
export class GetCommentByIdAction extends BaseAction<Comment> {
    constructor(
        private commentRepository?: CommentRepository,
        private commentService?: CommentService,
        private userService?: UserService
    ) {
        super();
    }
    async run(
        id: number,
        userData: QlikAuthData,
        getParent: any
    ): Promise<Comment> {
        const comments = await this.commentRepository.getAllWhereIncludeChild(
            {
                id,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
            },
            true
        );

        if (!comments || !comments.data || !comments.data.length) {
            throw new Errors.NotFoundError('Comment not found', {
                method: 'GetCommentByIdAction',
            });
        }

        const comment = comments.data[0];

        var parentComments: RepositoryResponse<Comment[]>;
        if (getParent) {
            parentComments =
                await this.commentRepository.getAllWhereIncludeChild(
                    {
                        id: comment.commentId,
                        customerId: userData.customerId,
                        tenantId: userData.tenantId,
                        appId: userData.appId,
                    },
                    true
                );
        }
        const users = await this.userService.getAllUsersInfo(userData);

        if (
            parentComments &&
            Array.isArray(parentComments.data) &&
            parentComments.data[0]
        ) {
            const parentComment = await this.commentService.PrepareComment(
                parentComments.data[0],
                userData,
                users
            );
            comment.parentComment = parentComment;
        }

        const response = await this.commentService.PrepareComment(
            comment,
            userData,
            users
        );

        return response;
    }
}
