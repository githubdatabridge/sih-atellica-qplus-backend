import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { CommentType, Comment } from '../../entities';
import { QlikAuthData } from '../../lib/qlik-auth';
import { RepositoryResponse } from '../../repositories/BaseRepository';
import { CommentService, UserService } from '../../services';
import { Errors } from '../../lib';

@injectable()
@autoInjectable()
export class GetAllCommentsAction extends BaseAction<
    RepositoryResponse<Comment[]>
> {
    constructor(
        private commentService?: CommentService,
        private userService?: UserService
    ) {
        super();
    }
    async run(
        type: CommentType,
        userData: QlikAuthData,
        filter: any[],
        pagination
    ): Promise<RepositoryResponse<Comment[]>> {
        let comments: RepositoryResponse<Comment[]>;

        if (type === CommentType.Report) {
            comments = await this.commentService.getAllCommentsForReports(
                userData,
                filter,
                pagination
            );
        } else if (type === CommentType.Visualization) {
            comments =
                await this.commentService.getAllCommentsForVisualizations(
                    userData,
                    filter,
                    pagination
                );
        } else {
            throw new Errors.ValidationError('Invalid comment type.', {
                method: 'GetAllCommentsAction',
                type,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                userId: userData.user.appUserId,
            });
        }

        const users = await this.userService.getAllUsersInfo(userData);

        comments.data = await this.commentService.PrepareComments(
            comments.data,
            userData,
            users
        );
        return comments;
    }
}
