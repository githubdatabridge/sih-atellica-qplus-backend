import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import {
    CommentRepository,
    ReactionRepository,
    QlikStateRepository,
    ActionRepository,
} from '../../repositories';
import * as Errors from '../../lib/errors';
import { NotifyOnCommentService, UserService } from '../../services';
import { NotificationType } from '../../entities';
import { QlikAuthData } from '../../lib/qlik-auth';

@injectable()
@autoInjectable()
export class DeleteCommentAction extends BaseAction<boolean> {
    constructor(
        private commentRepository: CommentRepository,
        private reactionRepository: ReactionRepository,
        private qlikStateRepository: QlikStateRepository,
        private notifyService: NotifyOnCommentService,
        private actionRepository: ActionRepository,
        private userService: UserService
    ) {
        super();
    }

    async run(id: number, userData: QlikAuthData): Promise<boolean> {
        const existingComment = await this.commentRepository.findByID(id);

        if (
            existingComment.customerId !== userData.customerId ||
            existingComment.tenantId !== userData.tenantId ||
            existingComment.appId !== userData.appId
        ) {
            throw new Errors.NotFoundError('Not Found', {
                method: 'DeleteCommentAction',
                commentId: existingComment.commentId,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                userId: existingComment.appUserId,
            });
        }

        if (!existingComment) {
            throw new Errors.NotFoundError('Not Found', {
                method: 'DeleteCommentAction',
            });
        }

        await this.commentRepository.deleteWhere({ commentId: id });
        await this.commentRepository.deleteWhere({ id });
        await this.reactionRepository.deleteWhere({ commentId: id });
        await this.qlikStateRepository.deleteWhere({
            id: existingComment.qlikStateId,
        });
        await this.actionRepository.deleteWhere({ commentId: id });

        const users = await this.userService.getAllUsersInfo(userData);
        this.notifyService.defineHandlers(
            [],
            [
                NotificationType.CustomerCommentCountChanged,
                NotificationType.ReportCommentCountChanged,
            ]
        );

        await this.notifyService.process(userData, existingComment, users);

        return true;
    }
}
