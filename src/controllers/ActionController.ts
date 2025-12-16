import { get, controller, options, route, put } from 'hapi-decorators';

import { BaseController } from './BaseController';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { autoInjectable } from 'tsyringe';

import * as ActionValidator from '../validators/ActionValidator';
import { Action, ActionKind, CommentType } from '../entities';
import { ActionRepository } from '../repositories';
import * as Joi from 'joi';
import { paginatorQueryValidator } from '../validators/PaginatorValidator';
import * as Errors from '../lib/errors';
import { RestfulFilter } from '../lib/RestfulFilter';
import { RestfulOrderBy } from '../lib/RestfulOrderBy';
import { ActionService } from '../services/ActionService';
import { transformAction } from '../transformers/actions/ActionTransformer';
import { headerValidator } from '../validators/HeaderValidator';
import { CreateActionAction } from '../actions/action/CreateActionAction';
import { UserService } from '../services';
import { QlikAuthData } from '../lib/qlik-auth';
import { QlikStrategies } from '../lib/strategies';
import { SCOPE } from '../lib';

@autoInjectable()
@controller('/actions')
export class ActionController extends BaseController {
    constructor(
        private actionRepository?: ActionRepository,
        private actionService?: ActionService,
        private createActionAction?: CreateActionAction,
        private userService?: UserService
    ) {
        super();
    }

    @options({
        description: 'List all actions with comments with visualization',
        tags: ['api', 'actions'],
        response: {
            schema: ActionValidator.actions,
        },
        validate: {
            query: paginatorQueryValidator.options({
                allowUnknown: true,
            }),

            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DEFAULT],
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    200: {
                        description: 'Success',
                    },
                    400: {
                        description: 'Bad request',
                    },
                    401: {
                        description: 'Unauthorized',
                    },
                    404: {
                        description: 'Resource not found',
                    },
                    409: {
                        description: 'Resource already exists',
                    },
                    412: {
                        description: 'Precondition Failed',
                    },
                },
            },
        },
    })
    @get('/')
    @Errors.handleError
    async getAllWithCommentsWithVisualization(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const filter = new RestfulFilter({
            id: ['eq'],
            appUserId: ['eq'],
            commentId: ['eq'],
            type: ['eq'],
            createdAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            updatedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            viewedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
        }).parse(request.query);

        const orderBy = new RestfulOrderBy([
            'createdAt',
            'viewedAt',
            'id',
            'updatedAt',
        ]).parse(request.query);

        if (orderBy.length == 0) {
            orderBy.push('createdAt', 'desc');
        }

        const page = parseInt(request.query.page as any);
        const perPage = parseInt(request.query.perPage as any);

        const _type: CommentType = CommentType.Visualization;

        const pagination = {
            currentPage: page,
            perPage,
            isLengthAware: true,
        };

        const users = await this.userService.getAllUsersInfo(userData);

        filter.push(['_reportId', 'eq', null]);

        const actions = await this.actionService.GetAllActionsOnComment(
            userData,
            users,
            filter,
            pagination,
            orderBy
        );

        actions.data = actions.data.map((action) => transformAction(action));
        return actions;
    }

    @options({
        description: 'List all actions with comments with reports',
        tags: ['api', 'actions'],
        response: {
            schema: ActionValidator.actions,
        },
        validate: {
            query: paginatorQueryValidator.options({
                allowUnknown: true,
            }),

            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DEFAULT],
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    200: {
                        description: 'Success',
                    },
                    400: {
                        description: 'Bad request',
                    },
                    401: {
                        description: 'Unauthorized',
                    },
                    404: {
                        description: 'Resource not found',
                    },
                    409: {
                        description: 'Resource already exists',
                    },
                    412: {
                        description: 'Precondition Failed',
                    },
                },
            },
        },
    })
    @get('/comments/reports')
    @Errors.handleError
    async getAllActionsWithCommentsWithReport(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const filter = new RestfulFilter({
            id: ['eq'],
            appUserId: ['eq'],
            commentId: ['eq'],
            createdAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            updatedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            viewedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
        }).parse(request.query);

        const orderBy = new RestfulOrderBy([
            'createdAt',
            'viewedAt',
            'id',
            'updatedAt',
        ]).parse(request.query);

        if (orderBy.length == 0) {
            orderBy.push('createdAt', 'desc');
        }

        const page = parseInt(request.query.page as any);
        const perPage = parseInt(request.query.perPage as any);

        const _type: CommentType = CommentType.Report;

        const pagination = {
            currentPage: page,
            perPage,
            isLengthAware: true,
        };

        const users = await this.userService.getAllUsersInfo(userData);

        filter.push(['_reportId', 'not', null]);

        const actions = await this.actionService.GetAllActionsOnComment(
            userData,
            users,
            filter,
            pagination,
            orderBy
        );

        actions.data = actions.data.map((action) => transformAction(action));

        return actions;
    }

    @options({
        description: 'List all actions with comments',
        tags: ['api', 'actions'],
        response: {
            schema: ActionValidator.actions,
        },
        validate: {
            query: paginatorQueryValidator.options({
                allowUnknown: true,
            }),

            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DEFAULT],
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    200: {
                        description: 'Success',
                    },
                    400: {
                        description: 'Bad request',
                    },
                    401: {
                        description: 'Unauthorized',
                    },
                    404: {
                        description: 'Resource not found',
                    },
                    409: {
                        description: 'Resource already exists',
                    },
                    412: {
                        description: 'Precondition Failed',
                    },
                },
            },
        },
    })
    @get('/comments')
    @Errors.handleError
    async getAllActionsWithComments(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const filter = new RestfulFilter({
            id: ['eq'],
            type: ['eq'],
            _reportId: ['eq', 'not'], //action.comment.reportId
            _visualizationId: ['eq', 'not'], //action.comment.visualizationId
            commentId: ['eq'],
            createdAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            updatedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            viewedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
        }).parse(request.query);

        const orderBy = new RestfulOrderBy([
            'createdAt',
            'viewedAt',
            'id',
            'updatedAt',
        ]).parse(request.query);

        if (orderBy.length == 0) {
            orderBy.push('createdAt', 'desc');
        }

        const page = parseInt(request.query.page as any);
        const perPage = parseInt(request.query.perPage as any);

        const _type: CommentType = CommentType.Report;

        const pagination = {
            currentPage: page,
            perPage,
            isLengthAware: true,
        };

        const users = await this.userService.getAllUsersInfo(userData);

        const actions = await this.actionService.GetAllActionsOnComment(
            userData,
            users,
            filter,
            pagination,
            orderBy
        );

        actions.data = actions.data.map((action) => transformAction(action));

        return actions;
    }

    @options({
        description: 'List all actions with reports',
        tags: ['api', 'actions'],
        response: {
            schema: ActionValidator.actions,
        },
        validate: {
            query: paginatorQueryValidator.options({ allowUnknown: true }),
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DEFAULT],
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    200: {
                        description: 'Success',
                    },
                    400: {
                        description: 'Bad request',
                    },
                    401: {
                        description: 'Unauthorized',
                    },
                    404: {
                        description: 'Resource not found',
                    },
                    409: {
                        description: 'Resource already exists',
                    },
                    412: {
                        description: 'Precondition Failed',
                    },
                },
            },
        },
    })
    @get('/reports')
    @Errors.handleError
    async getAllForReports(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const filter = new RestfulFilter({
            id: ['eq'],
            type: ['eq'],
            reportId: ['eq'],
            createdAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            updatedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            viewedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
        }).parse(request.query);

        const page = parseInt(request.query.page as any);
        const perPage = parseInt(request.query.perPage as any);

        const pagination = {
            currentPage: page,
            perPage,
            isLengthAware: true,
        };

        const orderBy = new RestfulOrderBy([
            'createdAt',
            'viewedAt',
            'id',
            'updatedAt',
        ]).parse(request.query);

        if (orderBy.length == 0) {
            orderBy.push('createdAt', 'desc');
        }

        const actions = await this.actionRepository.getAllByFilteringReports(
            userData.user.appUserId,
            userData.customerId,
            userData.tenantId,
            userData.appId,
            ['report'],
            filter,
            pagination,
            orderBy
        );

        const users = await this.userService.getAllUsersInfo(userData);

        actions.data = await this.actionService.PrepareActions(
            actions.data,
            ActionKind.Report,
            userData,
            users
        );

        actions.data = actions.data.map((action) => transformAction(action));

        return actions;
    }

    @options({
        description: 'Get a action',
        tags: ['api', 'actions'],
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }).label('ActionParamRequest'),
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DEFAULT],
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    200: {
                        description: 'Success',
                    },
                    400: {
                        description: 'Bad request',
                    },
                    401: {
                        description: 'Unauthorized',
                    },
                    404: {
                        description: 'Resource not found',
                    },
                    409: {
                        description: 'Resource already exists',
                    },
                    412: {
                        description: 'Precondition Failed',
                    },
                },
            },
        },
    })
    @get('/{id}')
    @Errors.handleError
    async get(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);

        const action = await this.actionRepository.getAll({
            id,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });

        if (!action || !action.data || !action.data.length) {
            throw new Errors.NotFoundError('Action not found', {
                method: 'GetSingleAction',
            });
        }

        const users = await this.userService.getAllUsersInfo(userData);

        action.data = await this.actionService.PrepareActions(
            action.data,
            action.data[0].reportId ? ActionKind.Report : ActionKind.Comment,
            userData,
            users
        );

        action.data[0] = transformAction(action.data[0]);

        return action.data[0];
    }

    @options({
        description: 'Get actions by commentId',
        tags: ['api', 'actions'],
        validate: {
            params: Joi.object({
                commentId: Joi.number().required(),
            }).label('CommentParamRequest'),
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DEFAULT],
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    200: {
                        description: 'Success',
                    },
                    400: {
                        description: 'Bad request',
                    },
                    401: {
                        description: 'Unauthorized',
                    },
                    404: {
                        description: 'Resource not found',
                    },
                    409: {
                        description: 'Resource already exists',
                    },
                    412: {
                        description: 'Precondition Failed',
                    },
                },
            },
        },
    })
    @get('/comment/{commentId}')
    @Errors.handleError
    async getByCommentId(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const commentId = parseInt(request.params.commentId);

        return await this.actionRepository.getAll({
            commentId,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });
    }

    @options({
        description: 'Removes an action',
        tags: ['api', 'actions'],
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }).label('DeleteActionParamRequest'),
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DEFAULT],
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    200: {
                        description: 'Success',
                    },
                    400: {
                        description: 'Bad request',
                    },
                    401: {
                        description: 'Unauthorized',
                    },
                    404: {
                        description: 'Resource not found',
                    },
                    409: {
                        description: 'Resource already exists',
                    },
                    412: {
                        description: 'Precondition Failed',
                    },
                },
            },
        },
    })
    @route('delete', '/{id}')
    @Errors.handleError
    async delete(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);

        const res = await this.actionRepository.deleteWhere({
            id,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });

        if (!res) {
            throw new Errors.NotFoundError('Action not found', {
                method: 'DeleteAction',
            });
        }

        return h.response().code(204);
    }

    @options({
        description: 'Updates an action',
        tags: ['api', 'actions'],
        response: {
            schema: ActionValidator.action,
        },
        validate: {
            payload: ActionValidator.updateRequest,
            params: Joi.object({
                id: Joi.number().required(),
            }).label('UpdateActionParamRequest'),
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DEFAULT],
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    200: {
                        description: 'Success',
                    },
                    400: {
                        description: 'Bad request',
                    },
                    401: {
                        description: 'Unauthorized',
                    },
                    404: {
                        description: 'Resource not found',
                    },
                    409: {
                        description: 'Resource already exists',
                    },
                    412: {
                        description: 'Precondition Failed',
                    },
                },
            },
        },
    })
    @put('/{id}')
    @Errors.handleError
    async update(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const data = request.payload as Action;
        const id = parseInt(request.params.id);

        const action = await this.actionRepository.updateWhere(
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

        const result = (
            await this.actionService.PrepareActions(
                [action],
                action.reportId ? ActionKind.Report : ActionKind.Comment,
                userData,
                users
            )
        )[0];

        return transformAction(result);
    }
}
