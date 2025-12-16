import { BaseController } from './BaseController';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { autoInjectable } from 'tsyringe';

import * as ReportValidator from '../validators/ReportValidator';
import * as ReportShareValidator from '../validators/ReportShareValidator';
import * as CommentValidator from '../validators/CommentValidator';
import Joi = require('joi');
import * as Errors from '../lib/errors';
import {
    controller,
    get,
    options,
    post,
    route,
    put,
    patch,
} from 'hapi-decorators';
import { CreateReportAction } from '../actions/report/CreateReportAction';
import { Report } from '../entities';
import { GetAllReportsAction } from '../actions/report/GetAllReportsAction';
import * as transformer from '../transformers/reports/ReportTransformer';
import { DeleteReportAction } from '../actions/report/DeleteReportAction';
import { UpdateReportAction } from '../actions/report/UpdateReportAction';
import { GetReportByIdAction } from '../actions/report/GetReportByIdAction';

import { ShareReportsAction } from '../actions/report/share/ShareReportsAction';
import { UnshareReportsAction } from '../actions/report/share/UnshareReportsAction';
import { GetSharedReportAction } from '../actions/report/share/GetSharedReportAction';
import { paginatorQueryValidator } from '../validators/PaginatorValidator';
import { RestfulFilter, SCOPE } from '../lib';
import { transformComment } from '../transformers/comments/CommentTransformer';
import { GetAllCommentsByReportIdAction } from '../actions/report/comment/GetAllCommentsByReportIdAction';
import { PatchReportAction } from '../actions/report/PatchReportAction';
import { headerValidator } from '../validators/HeaderValidator';
import { UsersWhoCanSeeReportsAction } from '../actions/report/users/UsersWhoCanSeeReportsAction';
import { QlikAuthData } from '../lib/qlik-auth';
import { CreateByExistingReportIdAction } from '../actions/report/CreateByExistingReportIdAction';
import { GetAllReportsSharedWithCurrentUserAction } from '../actions/report/GetAllReportsSharedWithCurrentUserAction';
import { QlikStrategies } from '../lib/strategies';
import { RestfulServiceFactory } from '../services';

@autoInjectable()
@controller('/reports')
export class ReportController extends BaseController {
    constructor(
        private createReportAction?: CreateReportAction,
        private deleteReportAction?: DeleteReportAction,
        private getAllReportsAction?: GetAllReportsAction,
        private updateReportAction?: UpdateReportAction,
        private getReportByIdAction?: GetReportByIdAction,
        private shareReportsAction?: ShareReportsAction,
        private unshareReportsAction?: UnshareReportsAction,
        private getSharedReportAction?: GetSharedReportAction,
        private getAllCommentsByReportIdAction?: GetAllCommentsByReportIdAction,
        private patchReportAction?: PatchReportAction,
        private usersWhoCanSeeReportsAction?: UsersWhoCanSeeReportsAction,
        private createByExistingReportIdAction?: CreateByExistingReportIdAction,
        private getAllReportsSharedWithUserAction?: GetAllReportsSharedWithCurrentUserAction,
        private restfulServiceFactory?: RestfulServiceFactory
    ) {
        super();
    }

    @options({
        description: 'Create report',
        tags: ['api', 'report'],
        response: {
            schema: ReportValidator.report,
        },
        validate: {
            payload: ReportValidator.createRequest,
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
    async create(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const data = request.payload as Report;

        const result = await this.createReportAction.run(data, userData);
        const response = transformer.transformReport(result);

        return h.response(response).code(201);
    }

    @options({
        description: 'List all reports',
        tags: ['api', 'reports'],
        notes: ` 
        filters:
            title: ['eq', 'not', 'like'],
            createdAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            updatedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            datasetId: ['eq'],
            id: ['eq'],
            appUserId: ['eq', 'not'],
            isSystem: ['eq', 'not'],
            isPinwallable: ['eq'],
            isFavourite: ['eq'],
            templateId: ['eq', 'not'],
        search:
            title: ['eq', 'like'],
            description: ['eq', 'like'],
            appUserId: ['eq', 'like'],
        orderBy: 'createdAt', 'id', 'updatedAt', 'title', 'appUserId'
        OrderByDefault: 'createdAt' as 'desc'

        example: .../reports?filter[appUserId][eq]=abc&filter[createdAt][eq]=abc&search[appUserId][like]=cva&orderBy[updatedAt][asc]
        `,
        response: {
            schema: ReportValidator.reports,
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
    async getAll(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const restfulService = this.restfulServiceFactory.create();

        restfulService
            .FilterDefs({
                title: ['eq', 'not', 'like'],
                createdAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
                updatedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
                datasetId: ['eq'],
                id: ['eq'],
                appUserId: ['eq', 'not'],
                isSystem: ['eq', 'not'],
                isPinwallable: ['eq'],
                isFavourite: ['eq'],
                templateId: ['eq', 'not'],
            })
            .SearchDefs({
                title: ['eq', 'like'],
                description: ['eq', 'like'],
                appUserId: ['eq', 'like'],
            })
            .OrderByDefs(['createdAt', 'id', 'updatedAt', 'title', 'appUserId'])
            .OrderByDefault('createdAt', 'desc');

        const page = parseInt(request.query.page as any);
        const perPage = parseInt(request.query.perPage as any);

        const pagination = {
            currentPage: page,
            perPage,
            isLengthAware: true,
        };

        const parse = restfulService.parse(request.query);

        const result = await this.getAllReportsAction.run(
            userData,
            parse.filter,
            parse.search,
            parse.orderBy,
            pagination
        );

        const response = {
            pagination: result.pagination,
            data: result.data.map((report) =>
                transformer.transformReport(report)
            ),
            operators: restfulService.operator,
        };

        return response;
    }
    @options({
        description: 'Get a single Report',
        tags: ['api', 'report'],
        response: {
            schema: ReportValidator.report,
        },
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }).label('IdParams'),
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
    async getById(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;
        const id = parseInt(request.params.id);
        const result = await this.getReportByIdAction.run(id, userData);

        const response = transformer.transformReport(result);

        return response;
    }

    @options({
        description: 'Updates a Report',
        tags: ['api', 'reports'],
        response: {
            schema: ReportValidator.report,
        },
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }).label('IdParams'),
            payload: ReportValidator.updateRequest,
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
                },
            },
        },
    })
    @put('/{id}')
    @Errors.handleError
    async updateById(request: Request) {
        const id = parseInt(request.params.id);
        const data = request.payload as Report;
        const userData = request.auth.credentials.userData as QlikAuthData;

        const result = await this.updateReportAction.run(id, data, userData);

        const response = transformer.transformReport(result);

        return response;
    }

    @options({
        description: 'Delete a report',
        tags: ['api', 'reports'],
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }).label('IdParams'),
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DEFAULT],
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    204: {
                        description: 'Resource Deleted',
                    },
                    401: {
                        description: 'Unauthorized',
                    },
                    404: {
                        description: 'Resource not found',
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

        await this.deleteReportAction.run(userData, id);

        return h.response().code(204);
    }

    @options({
        description: 'Share a report',
        tags: ['api', 'reports'],
        response: {
            schema: ReportShareValidator.shareResponse,
        },
        validate: {
            payload: ReportShareValidator.shareRequest,
            params: Joi.object({
                id: Joi.number().required(),
            }).label('IdParams'),
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DEFAULT],
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    201: {
                        description: 'Successfully created',
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
                },
            },
        },
    })
    @route('post', '/{id}/share')
    @Errors.handleError
    async shareReport(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);
        const data = request.payload as any;
        const listOfUser = data.appUserIds as string[];

        const result = await this.shareReportsAction.run(
            id,
            listOfUser,
            userData
        );

        return h.response(result).code(201);
    }

    @options({
        description: 'Unshare a report',
        tags: ['api', 'reports'],
        validate: {
            payload: ReportShareValidator.shareRequest,
            params: Joi.object({
                id: Joi.number().required(),
            }).label('IdParams'),
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DEFAULT],
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    201: {
                        description: 'Successfully created',
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
                },
            },
        },
    })
    @route('delete', '/{id}/share')
    @Errors.handleError
    async unshareReport(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);
        const data = request.payload as any;
        const listOfUser = data.appUserIds as string[];

        await this.unshareReportsAction.run(id, listOfUser, userData);

        return h.response().code(200);
    }
    @options({
        description: 'Get the Users with whom the report is shared',
        tags: ['api', 'reports'],
        response: {
            schema: ReportShareValidator.shareResponse,
        },
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }).label('IdParams'),
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
                },
            },
        },
    })
    @route('get', '/{id}/share')
    @Errors.handleError
    async getUsersFromSharedReport(request: Request, _h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);

        const result = await this.getSharedReportAction.run(id, userData);

        return result;
    }

    @options({
        description: 'List all comments from Report',
        tags: ['api', 'comments'],
        response: {
            schema: CommentValidator.comments,
        },
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }).label('IdParams'),
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
    @get('/{id}/comments')
    @Errors.handleError
    async getAllCommentsByReportId(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const filter = new RestfulFilter({
            id: ['eq'],
            content: ['eq', 'like'],
            appUserId: ['eq'],
            createdAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            updatedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
        }).parse(request.query);

        const page = parseInt(request.query.page as any);
        const perPage = parseInt(request.query.perPage as any);

        const id = parseInt(request.params.id);

        const pagination = {
            currentPage: page,
            perPage,
            isLengthAware: true,
        };

        const result = await this.getAllCommentsByReportIdAction.run(
            id,
            userData,
            filter,
            pagination
        );

        result.data = result.data.map((comment) => {
            return transformComment(comment);
        });

        return result;
    }

    @options({
        description: 'Patch a Report',
        tags: ['api', 'reports'],
        response: {
            schema: ReportValidator.report,
        },
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }).label('IdParams'),
            payload: ReportValidator.patchRequest,
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
                },
            },
        },
    })
    @patch('/{id}')
    @Errors.handleError
    async patchById(request: Request) {
        const id = parseInt(request.params.id);
        const data = request.payload as Report;
        const userData = request.auth.credentials.userData as QlikAuthData;

        const result = await this.patchReportAction.run(id, data, userData);

        const response = transformer.transformReport(result);

        return response;
    }

    @options({
        description: 'Get the Users who can see report',
        tags: ['api', 'reports'],
        response: {
            schema: ReportShareValidator.shareResponse,
        },
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }).label('IdParams'),
            query: Joi.object({
                includeMe: Joi.bool()
                    .optional()
                    .default(true)
                    .label('IncludeMeBoolParam'),
            }).label('IncludeMeQueryParams'),
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
                },
            },
        },
    })
    @route('get', '/{id}/users')
    @Errors.handleError
    async getUsersWhichCanSeeReport(request: Request, _h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);
        const includeMe = Boolean(request.query.includeMe);

        return await this.usersWhoCanSeeReportsAction.run(
            userData,
            id,
            includeMe
        );
    }

    @options({
        description: 'Create report by Id of existing one.',
        tags: ['api', 'report'],
        response: {
            schema: ReportValidator.report,
        },
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }).label('IdParams'),
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
    @post('/{id}')
    @Errors.handleError
    async createByExistingReportId(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);
        const result = await this.createByExistingReportIdAction.run(
            id,
            userData
        );

        const response = transformer.transformReport(result);

        return response;
    }
    @options({
        description: 'List all reports shared with current user',
        tags: ['api', 'reports'],
        response: {
            schema: ReportValidator.reports,
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
    @get('/shared')
    @Errors.handleError
    async getAllShared(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const filter = new RestfulFilter({
            id: ['eq'],
            appUserId: ['eq', 'not'],
            isPinwallable: ['eq'],
            isFavourite: ['eq'],
        }).parse(request.query);

        const page = parseInt(request.query.page as any);
        const perPage = parseInt(request.query.perPage as any);

        const pagination = {
            currentPage: page,
            perPage,
            isLengthAware: true,
        };

        const result = await this.getAllReportsSharedWithUserAction.run(
            userData,
            filter,
            pagination
        );

        const response = {
            pagination: result.pagination,
            data: result.data.map((report) =>
                transformer.transformReport(report)
            ),
        };

        return response;
    }
}
