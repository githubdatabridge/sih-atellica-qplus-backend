import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import {
    CommentRepository,
    VisualizationRepository,
    QlikStateRepository,
    ReactionRepository,
} from '../../repositories';
import { Reaction } from '../../entities';
import * as Errors from '../../lib/errors';
import {
    NotifyOnReactionService,
    QlikStateService,
    UserService,
} from '../../services';
import { QlikAuthData } from '../../lib/qlik-auth';
import { AssignUser } from '../../lib/util';

@injectable()
@autoInjectable()
export class CreateReactionAction extends BaseAction<Reaction> {
    constructor(
        private reactionRepository: ReactionRepository,
        private notifyService: NotifyOnReactionService,
        private commentRepository: CommentRepository,
        private visualizationRepository: VisualizationRepository,
        private qlikStateRepository: QlikStateRepository,
        private qlikStateService?: QlikStateService,
        private userService?: UserService
    ) {
        super();
    }

    async run(data: Reaction, userData: QlikAuthData): Promise<Reaction> {
        if (data.commentId && data.visualizationId) {
            throw new Errors.AlreadyExistsError(
                'Reaction cannot belong both to Comment and Visualization',
                {
                    method: 'CreateReaction',
                    commentId: data.commentId,
                    visualizationId: data.visualizationId,
                    customerId: data.customerId,
                    tenantId: data.tenantId,
                    appId: data.appId,
                    userId: data.appUserId,
                }
            );
        }

        if (!data.commentId && !data.visualizationId) {
            throw new Errors.ValidationError(
                'Reaction must belong to Comment OR Visualization',
                {
                    method: 'CreateReaction',
                    reactionId: data.id,
                    customerId: data.customerId,
                    tenantId: data.tenantId,
                    appId: data.appId,
                    userId: data.appUserId,
                }
            );
        }

        if (data.commentId) {
            if (data.qlikState) {
                throw new Errors.ValidationError(
                    'Reaction belonging to comment cannot have qlikState',
                    {
                        method: 'CreateReaction',
                        reactionId: data.id,
                        customerId: data.customerId,
                        tenantId: data.tenantId,
                        appId: data.appId,
                        userId: data.appUserId,
                    }
                );
            }

            const existingComment = await this.commentRepository.findByID(
                data.commentId
            );

            if (!existingComment) {
                throw new Errors.NotFoundError('Comment does not exist', {
                    method: 'CreateReaction',
                    commentId: data.commentId,
                    customerId: data.customerId,
                    tenantId: data.tenantId,
                    appId: data.appId,
                    userId: data.appUserId,
                });
            }
        } else if (data.visualizationId) {
            if (!data.qlikState) {
                throw new Errors.ValidationError(
                    'Reaction that belongs to visualization must have qlikState',
                    {
                        method: 'CreateReaction',
                        reactionId: data.id,
                        visualizationId: data.visualizationId,
                        customerId: data.customerId,
                        tenantId: data.tenantId,
                        appId: data.appId,
                        userId: data.appUserId,
                    }
                );
            }

            const existingVisualization =
                await this.visualizationRepository.findByID(
                    data.visualizationId
                );

            if (!existingVisualization) {
                throw new Errors.NotFoundError('Visualization does not exist', {
                    method: 'CreateReaction',
                    visualizationId: data.visualizationId,
                    customerId: data.customerId,
                    tenantId: data.tenantId,
                    appId: data.appId,
                    userId: data.appUserId,
                });
            }

            if (
                existingVisualization.customerId !== data.customerId ||
                existingVisualization.tenantId !== data.tenantId ||
                existingVisualization.appId !== data.appId
            ) {
                throw new Errors.ValidationError(
                    'Visualization does not belong to chosen customerId, tenantId or appId',
                    {
                        method: 'CreateReaction',
                        customerId: data.customerId,
                        tenantId: data.tenantId,
                        appId: data.appId,
                        visualizationId: data.visualizationId,
                        userId: data.appUserId,
                    }
                );
            }
        }

        if (data.qlikState) {
            const newQlikState = this.qlikStateService.handleTextFields(
                data.qlikState
            );
            const qlikState =
                await this.qlikStateRepository.create(newQlikState);

            if (!qlikState) {
                throw new Errors.InternalError('QlikState creation failed', {
                    method: 'CreateReaction',
                    reactionId: data.id,
                    customerId: data.customerId,
                    tenantId: data.tenantId,
                    appId: data.appId,
                    userId: data.appUserId,
                });
            }

            data.qlikStateId = qlikState.id;
        }

        delete data.qlikState;

        const response = await this.reactionRepository.create(data);

        const users = await this.userService.getAllUsersInfo(userData);

        response.user = AssignUser(response.appUserId, users);

        this.notifyService.notifyReactionCreated(userData, response);

        this.notifyService.notifyReactionCountChanged(
            response.appUserId,
            response.customerId,
            response.tenantId,
            response.appId,
            response.visualizationId
        );

        return response;
    }
}
