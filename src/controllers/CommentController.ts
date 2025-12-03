import { get, controller, options, post, route, patch } from 'hapi-decorators';

import { BaseController } from './BaseController';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { autoInjectable } from 'tsyringe';
import * as CommentValidator from '../validators/CommentValidator';
import { CommentRepository, ReportRepository } from '../repositories';
import { CommentType, Comment } from '../entities';
import Joi = require('joi');
import { CreateCommentAction } from '../actions';
import { DeleteCommentAction } from '../actions/comments/DeleteCommentAction';
import { paginatorQueryValidator } from '../validators/PaginatorValidator';
import { UpdateCommentAction } from '../actions/comments/UpdateCommentAction';
import * as Errors from '../lib/errors';
import { RestfulFilter, SCOPE } from '../lib';
import { transformComment } from '../transformers/comments/CommentTransformer';
import { GetAllCommentsAction } from '../actions/comments/GetAllCommentsAction';
import { headerValidator } from '../validators/HeaderValidator';
import { GetCommentByIdAction } from '../actions/comments/GetCommentByIdAction';
import { ReportService } from '../services';
import { QlikAuthData } from '../lib/qlik-auth';
import { QlikStrategies } from '../lib/strategies';

@autoInjectable()
@controller('/comments')
export class CommentController extends BaseController {
    constructor(
        private commentRepository?: CommentRepository,
        private createCommentAction?: CreateCommentAction,
        private deleteCommentAction?: DeleteCommentAction,
        private updateCommentAction?: UpdateCommentAction,
        private getAllCommentsAction?: GetAllCommentsAction,
        private getCommentByIdAction?: GetCommentByIdAction,
        private reportRepository?: ReportRepository
    ) {
        super();
    }

    @options({
        description: 'Add a comment',
        tags: ['api', 'comments'],
        response: {
            schema: CommentValidator.comment,
        },
        validate: {
            payload: CommentValidator.createRequest,
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
    @post('/')
    @Errors.handleError
    async create(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const data = request.payload as Comment;

        const result = await this.createCommentAction.run(data, userData);
        const response = transformComment(result);
        return response;
    }

    @options({
        description: 'List all comments',
        tags: ['api', 'comments'],
        response: {
            schema: CommentValidator.comments,
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
    @get('/')
    @Errors.handleError
    async getAllCommentsWithVisualization(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const filter = new RestfulFilter({
            id: ['eq'],
            content: ['eq', 'like'],
            appUserId: ['eq'],
            createdAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            updatedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            visualizationId: ['eq'],
            reportId: ['eq'],
        }).parse(request.query);

        const page = parseInt(request.query.page as any);
        const perPage = parseInt(request.query.perPage as any);

        const pagination = {
            currentPage: page,
            perPage,
            isLengthAware: true,
        };

        const type = CommentType.Visualization;

        const result = await this.getAllCommentsAction.run(
            type,
            userData,
            filter,
            pagination
        );

        result.data = result.data.map((comment) => transformComment(comment));
        return result;
    }
    @options({
        description: 'List all comments with report',
        tags: ['api', 'comments'],
        response: {
            schema: CommentValidator.comments,
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
    async getAllCommentsWithReport(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const filter = new RestfulFilter({
            id: ['eq'],
            content: ['eq', 'like'],
            appUserId: ['eq'],
            createdAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            updatedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            visualizationId: ['eq'],
            reportId: ['eq'],
        }).parse(request.query);

        const page = parseInt(request.query.page as any);
        const perPage = parseInt(request.query.perPage as any);

        const pagination = {
            currentPage: page,
            perPage,
            isLengthAware: true,
        };

        const type = CommentType.Report;

        const result = await this.getAllCommentsAction.run(
            type,
            userData,
            filter,
            pagination
        );

        result.data = result.data.map((comment) => transformComment(comment));
        return result;
    }

    @options({
        description: 'Get a comment',
        tags: ['api', 'comments'],
        response: {
            schema: CommentValidator.comment,
        },
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }).label('CommentGetParamsRequest'),
            query: Joi.object({
                getParent: Joi.boolean().optional(),
            })
                .options({ allowUnknown: true })
                .label('CommentGetQueryRequest'),
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
        const getParent = request.query.getParent;

        const response = await this.getCommentByIdAction.run(
            id,
            userData,
            getParent
        );

        return transformComment(response);
    }

    @options({
        description: 'Get comment by scope and visualizationId',
        tags: ['api', 'visualization'],
        validate: {
            params: Joi.object({
                scope: Joi.string().required(),
                visualizationId: Joi.number().required(),
            }).label('CommentGetVisualizationParamsRequest'),
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
    @get('/{scope}/{visualizationId}')
    @Errors.handleError
    async getByParams(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const page = parseInt(request.query.page as any);
        const perPage = parseInt(request.query.perPage as any);

        const pagination = {
            currentPage: page,
            perPage,
            isLengthAware: true,
        };

        const scope = request.params.scope;
        const visualizationId = parseInt(request.params.visualizationId);

        const comments = await this.commentRepository.getAll(
            {
                scope,
                visualizationId,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                commentId: null,
            },
            ['qlik_state', 'visualization', 'comments'],
            null,
            pagination
        );

        comments.data = await this.commentRepository.assignReactionToComments(
            comments.data,
            userData.user.appUserId
        );

        return comments;
    }

    @options({
        description: 'Get comment count by scope and visualizationId',
        tags: ['api', 'visualization'],
        validate: {
            params: Joi.object({
                scope: Joi.string().required(),
                visualizationId: Joi.number().required(),
            }).label('CommentCountByVisualizationParamsRequest'),
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
    @get('/count/{scope}/{visualizationId}')
    @Errors.handleError
    async getCountByParams(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const scope = request.params.scope;
        const visualizationId = parseInt(request.params.visualizationId);

        const count = await this.commentRepository.getCount({
            scope,
            visualizationId,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });

        return {
            count,
        };
    }

    @options({
        description: 'Removes a comment',
        tags: ['api', 'comments'],
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }).label('RemoveCommentParamRequest'),
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

        await this.deleteCommentAction.run(id, userData);

        return h.response().code(204);
    }

    @options({
        description: 'Update a comment',
        tags: ['api', 'comments'],
        response: {
            schema: CommentValidator.comment,
        },
        validate: {
            payload: CommentValidator.updateRequest,
            params: Joi.object({
                id: Joi.number().required(),
            }).label('UpdateCommentParamsRequest'),
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
    @patch('/{id}')
    @Errors.handleError
    async update(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const data = request.payload as Comment;
        const id = parseInt(request.params.id);
        const comment = await this.updateCommentAction.run(id, data, userData);
        return transformComment(comment);
    }

    @options({
        description: 'Get unread user comments based on the actions',
        tags: ['api', 'comments'],
        validate: {
            params: Joi.object({
                appUserId: Joi.string().required(),
                scope: Joi.string().required(),
            }).label('CommentByActionsParamsRequest'),
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
    @get('/user/notification/{appUserId}/{scope}')
    @Errors.handleError
    async getUnreadBasedOnActions(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const appUserId = request.params.appUserId;
        const scope = request.params.scope;

        return await this.commentRepository.getUnreadByAction(
            appUserId,
            scope,
            userData.customerId,
            userData.tenantId,
            userData.appId
        );
    }

    @options({
        description: 'Get comment count and selectionHashes by visualizationId',
        tags: ['api', 'comments'],
        response: {
            schema: Joi.object({
                count: Joi.number(),
                selectionHashes: Joi.array().items(Joi.number().allow(null)),
            }).label('CommentCountResponse'),
        },
        validate: {
            params: Joi.object({
                visualizationId: Joi.number().required(),
            }).label('CommentCountSelectionVisualizationParamsRequest'),
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
    @get('/visualizations/count/{visualizationId}')
    @Errors.handleError
    async getCountAndHashesByVisualizationId(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const visualizationId = parseInt(request.params.visualizationId);

        const comments = await this.commentRepository.findAll(
            {
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                visualizationId,
                commentId: null,
            },
            ['qlik_state', 'comments']
        );

        const selectionHashes = [];
        let count = 0;

        comments.forEach((comment) => {
            selectionHashes.push(comment.qlikState.qsSelectionHash);
            count += 1;

            comment.comments.forEach((cc) => {
                selectionHashes.push(comment.qlikState.qsSelectionHash);
                count += 1;
            });
        });

        return {
            count,
            selectionHashes,
        };
    }

    @options({
        description: 'Get comment count and selectionHashes by reportId',
        tags: ['api', 'comments'],
        response: {
            schema: Joi.object({
                count: Joi.number(),
                selectionHashes: Joi.array().items(Joi.number().allow(null)),
            }).label('CommentCountResponse'),
        },
        validate: {
            params: Joi.object({
                reportId: Joi.number().required(),
            }).label('CommentCountSelectionReportParamsRequest'),
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
    @get('/reports/count/{reportId}')
    @Errors.handleError
    async getCountAndHashesByReportId(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const reportId = parseInt(request.params.reportId);

        const followers = await this.reportRepository.GetAllFollowersOfReport(
            userData.customerId,
            userData.tenantId,
            userData.appId,
            reportId
        );

        if (followers.length === 0) {
            throw new Errors.NotFoundError('Report not found.', {
                method: 'getCountAndHashesByReportId',
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserId: userData.user.appUserId,
            });
        } else if (!followers.includes(userData.user.appUserId)) {
            throw new Errors.Forbidden('User is not allow to see report.', {
                method: 'getCountAndHashesByReportId',
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserId: userData.user.appUserId,
            });
        }

        const comments = await this.commentRepository.findAll(
            {
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                reportId,
                commentId: null,
            },
            ['qlik_state', 'comments']
        );

        const selectionHashes = [];
        let count = 0;

        comments.forEach((comment) => {
            selectionHashes.push(
                comment.qlikState ? comment.qlikState.qsSelectionHash : null
            );
            count += 1;

            comment.comments.forEach((cc) => {
                selectionHashes.push(
                    comment.qlikState ? comment.qlikState.qsSelectionHash : null
                );
                count += 1;
            });
        });

        return {
            count,
            selectionHashes,
        };
    }
}
