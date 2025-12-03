import { BaseAction } from '../BaseAction';
import { injectable, autoInjectable } from 'tsyringe';
import { QlikStateRepository, ReactionRepository } from '../../repositories';
import { Reaction } from '../../entities';
import * as Errors from '../../lib/errors';
import { QlikStateService, UserService } from '../../services';
import { QlikAuthData } from '../../lib/qlik-auth';
import { AssignUser } from '../../lib/util';

@injectable()
@autoInjectable()
export class UpdateReactionAction extends BaseAction<Reaction> {
    constructor(
        private reactionRepository: ReactionRepository,
        private qlikStateRepository: QlikStateRepository,
        private qlikStateService?: QlikStateService,
        private userService?: UserService
    ) {
        super();
    }

    async run(
        id: number,
        data: Reaction,
        userData: QlikAuthData
    ): Promise<Reaction> {
        const reaction = await this.reactionRepository.findByID(id);

        if (
            !reaction ||
            reaction.appUserId !== userData.user.appUserId ||
            reaction.customerId !== userData.customerId ||
            reaction.tenantId !== userData.tenantId ||
            reaction.appId !== userData.appId
        ) {
            throw new Errors.NotFoundError('Reaction not found', {
                method: 'UpdateReaction',
                reactionId: id,
                userId: userData.user.appUserId,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
            });
        }

        if (data.qlikState) {

            const newQlikState = this.qlikStateService.handleTextFields(data.qlikState);
            const qlikState = await this.qlikStateRepository.create(
                newQlikState
            );

            if (!qlikState) {
                throw new Errors.InternalError('qlikState creation failed', {
                    method: 'UpdateReaction',
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                    userId: userData.user.appUserId,
                    reactionId: data.id,
                });
            }

            data.qlikStateId = qlikState.id;

            if (reaction.qlikStateId) {
                await this.qlikStateRepository.deleteWhere({
                    id: reaction.qlikStateId,
                });
            }
        }

        if (data.qlikState === null && reaction.qlikStateId) {
            await this.qlikStateRepository.deleteWhere({
                id: reaction.qlikStateId,
            });

            data.qlikStateId = null;
        }

        delete data.qlikState;

        const result = await this.reactionRepository.updateWhere(
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

        result.user = AssignUser(result.appUserId, users);
        return result;
    }
}
