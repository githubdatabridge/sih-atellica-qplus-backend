import { autoInjectable, injectable } from 'tsyringe';
import { Action, ActionKind } from '../../entities';
import { Errors } from '../../lib';
import { QlikAuthData } from '../../lib/qlik-auth';
import {
    ActionRepository,
    CommentRepository,
    ReportRepository,
} from '../../repositories';
import { CommentService, UserService } from '../../services';
import { ActionService } from '../../services/ActionService';
import { BaseAction } from '../BaseAction';

@injectable()
@autoInjectable()
export class CreateActionAction extends BaseAction<Action> {
    constructor(
        private reportRepository?: ReportRepository,
        private commentService?: CommentService,
        private commentRepository?: CommentRepository,
        private actionRepository?: ActionRepository,
        private actionService?: ActionService,
        private userService?: UserService
    ) {
        super();
    }

    async run(data: Action, userData: QlikAuthData): Promise<Action> {
        const type = data.reportId ? ActionKind.Report : ActionKind.Comment;

        let entities;

        if (type === ActionKind.Comment) {
            const comments = await this.commentRepository.findAllIn(
                [data.commentId],
                'id',
                {
                    customerId: userData.customerId,
                    tenantId: userData.tenantId,
                    appId: userData.appId,
                }
            );

            if (!comments || !Array.isArray(comments) || !comments[0]) {
                throw new Errors.NotFoundError(`${type} not found.`, {
                    method: 'CreateAction',
                    message: 'Not found in database by given Id.',
                });
            }

            if (comments[0].reportId) {
                const appUserIds =
                    await this.reportRepository.GetAllFollowersOfReport(
                        userData.customerId,
                        userData.tenantId,
                        userData.appId,
                        comments[0].reportId
                    );

                if (!appUserIds.includes(userData.user.appUserId)) {
                    throw new Errors.ValidationError(
                        'User not allowed to create action on given comment.',
                        {
                            method: 'CreateAction',
                            data_appUserId: data.appUserId,
                            creator_appUserId: userData.user.appUserId,
                        }
                    );
                }

                if (!appUserIds.includes(data.appUserId)) {
                    throw new Errors.ValidationError(
                        'Action on given comment not allowed for this user.',
                        {
                            method: 'CreateAction',
                            data_appUserId: data.appUserId,
                            creator_appUserId: userData.user.appUserId,
                        }
                    );
                }

                entities = comments;
            } else if (comments[0].visualizationId) {
                entities = (
                    await this.commentService.getAllCommentsForVisualizations(
                        userData,
                        [{ id: data.commentId }]
                    )
                ).data.filter((x) => x.id === data.commentId);
            } else {
                entities = null;
            }
        } else {
            throw new Errors.ValidationError('Action requires commentId.', {
                method: 'CreateAction',
            });
        }

        if (!entities || !Array.isArray(entities) || !entities[0]) {
            throw new Errors.NotFoundError(`${type} not found.`, {
                method: 'CreateAction',
            });
        }

        const action = await this.actionRepository.create(data);

        if (!action) {
            throw new Errors.NotFoundError('Action failed to create.', {
                method: 'CreateAction',
            });
        }

        action[type] = entities[0];

        const users = await this.userService.getAllUsersInfo(userData);

        var result = await this.actionService.PrepareActions(
            [action],
            type,
            userData,
            users
        );

        return result[0];
    }
}
