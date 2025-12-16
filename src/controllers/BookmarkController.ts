import { Request, ResponseToolkit } from '@hapi/hapi';
import {
    controller,
    get,
    options,
    post,
    put,
    route,
    del,
} from 'hapi-decorators';
import { autoInjectable } from 'tsyringe';
import { Errors, SCOPE } from '../lib';
import { transformBookmark } from '../transformers/bookmarks/BookmarkTransformer';
import * as BookmarkValidator from '../validators/BookmarkValidator';
import Joi = require('joi');
import { Bookmark } from '../entities';
import { headerValidator } from '../validators/HeaderValidator';
import { QlikAuthData } from '../lib/qlik-auth';
import { QlikStrategies } from '../lib/strategies';
import { paginatorQueryValidator } from '../validators/PaginatorValidator';
import { RestfulServiceFactory } from '../services';
import { UpdateBookmarkAction } from '../actions/bookmark/UpdateBookmarkAction';
import { CreateBookmarkAction } from '../actions/bookmark/CreateBookmarkAction';
import { DeleteBookmarkAction } from '../actions/bookmark/DeleteBookmarkAction';
import { GetAllBookmarksAction } from '../actions/bookmark/GetAllBookmarksAction';
import { GetBookmarkByIdAction } from '../actions/bookmark/GetBookmarkByIdAction';
import { BaseController } from './BaseController';
import { ShareBookmarksAction } from '../actions/bookmark/share/ShareBookmarksAction';
import { UnshareBookmarkAction } from '../actions/bookmark/share/UnshareBookmarksAction';
import { GetUsersWithClaimOnBookmarkAction } from '../actions/bookmark/share/GetUsersWithClaimOnBookmarkAction';

@autoInjectable()
@controller('/bookmarks')
export class BookmarkController extends BaseController {
    constructor(
        private updateBookmarkAction?: UpdateBookmarkAction,
        private createBookmarkAction?: CreateBookmarkAction,
        private deleteBookmarkAction?: DeleteBookmarkAction,
        private getAllBookmarksAction?: GetAllBookmarksAction,
        private getBookmarkByIdAction?: GetBookmarkByIdAction,
        private restfulServiceFactory?: RestfulServiceFactory,
        private shareBookmarkAction?: ShareBookmarksAction,
        private unshareBookmarkAction?: UnshareBookmarkAction,
        private getUsersWithClaimOnBookmarkAction?: GetUsersWithClaimOnBookmarkAction
    ) {
        super();
    }

    @options({
        description: 'Create bookmark',
        tags: ['api', 'bookmark'],
        response: {
            schema: BookmarkValidator.bookmark,
        },
        validate: {
            payload: BookmarkValidator.createRequest,
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
                        description: 'Created',
                    },
                    400: {
                        description: 'Bad request',
                    },
                    401: {
                        description: 'Unauthorized',
                    },
                    403: {
                        description: 'Forbidden',
                    },
                    409: {
                        description: 'Conflict',
                    },
                },
            },
        },
    })
    @post('/')
    @Errors.handleError
    async create(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const data = request.payload as Bookmark;

        const result = await this.createBookmarkAction.run(data, userData);

        return h.response(transformBookmark(result)).code(201);
    }

    @options({
        description: 'Get all bookmark',
        tags: ['api', 'bookmark'],
        notes: ` 
        filters:
            id: ['eq', 'not'],
            isPublic: ['eq'],
            appUserId: ['eq', 'not', 'like'],
            name: ['eq', 'not', 'like'], 
            path: ['eq', 'not', 'like'], 
            createdAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            updatedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
        search:
            appUserId: ['eq', 'like'],
            isPublic: ['eq'],
            name: ['eq', 'like'],
            path: ['eq', 'like'],
        orderBy: 'createdAt', 'id', 'updatedAt', 'name'
        OrderByDefault: 'createdAt' as 'desc'

        example: .../bookmarks?filter[appUserId][eq]=abc&filter[createdAt][eq]=abc&search[appUserId][like]=cva&orderBy[updatedAt][asc]
        `,
        response: {
            schema: BookmarkValidator.bookmarks,
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
                },
            },
        },
    })
    @route('get', '/')
    @Errors.handleError
    async getAll(request: Request, _h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const restfulService = this.restfulServiceFactory.create();

        restfulService
            .FilterDefs({
                id: ['eq', 'not'],
                isPublic: ['eq'],
                appUserId: ['eq', 'not', 'like'],
                name: ['eq', 'not', 'like'],
                path: ['eq', 'not', 'like'],
                createdAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
                updatedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            })
            .SearchDefs({
                appUserId: ['eq', 'like'],
                isPublic: ['eq'],
                path: ['eq', 'like'],
                name: ['eq', 'like'],
            })
            .OrderByDefs(['createdAt', 'id', 'updatedAt', 'name'])
            .OrderByDefault('createdAt', 'desc');

        const page = parseInt(request.query.page as any);
        const perPage = parseInt(request.query.perPage as any);

        const pagination = {
            currentPage: page,
            perPage,
            isLengthAware: true,
        };
        const parse = restfulService.parse(request.query);
        const result = await this.getAllBookmarksAction.run(
            userData,
            parse.filter,
            parse.search,
            parse.orderBy,
            pagination
        );

        return {
            data: result.data.map((x) => transformBookmark(x)),
            pagination: result.pagination,
            operators: restfulService.operator,
        };
    }

    @options({
        description: 'Get a single Bookmark',
        tags: ['api', 'bookmark'],
        response: {
            schema: BookmarkValidator.bookmark,
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
    @get('/{id}')
    @Errors.handleError
    async getBookmarkById(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;
        const id = parseInt(request.params.id);

        const result = await this.getBookmarkByIdAction.run(userData, id);

        return transformBookmark(result);
    }

    @options({
        description: 'Update Bookmark',
        tags: ['api', 'bookmark'],
        response: {
            schema: BookmarkValidator.bookmark,
        },
        validate: {
            payload: BookmarkValidator.updateRequest,
            params: Joi.object({
                id: Joi.number().required(),
            }).label('IdParams'),
            headers: headerValidator,
            failAction: (r, h, err) => {
                throw err;
            },
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
                    403: {
                        description: 'Forbidden',
                    },
                    404: {
                        description: 'Resource not found',
                    },
                    409: {
                        description: 'Conflict',
                    },
                },
            },
        },
    })
    @put('/{id}')
    @Errors.handleError
    async update(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;
        const id = parseInt(request.params.id);

        const bookmarkForUpdate = request.payload as Bookmark;
        bookmarkForUpdate.id = id;

        const result = await this.updateBookmarkAction.run(
            bookmarkForUpdate,
            userData
        );

        return transformBookmark(result);
    }
    @options({
        description: 'Delete Bookmark',
        tags: ['api', 'bookmark'],
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }).label('IdParams'),
            query: Joi.object({
                cascade: Joi.bool().default(false).label('CascadeBoolParam'),
            }).label('CascadeQueryParams'),
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
                        description: 'No Content',
                    },
                    400: {
                        description: 'Bad request',
                    },
                    401: {
                        description: 'Unauthorized',
                    },
                    403: {
                        description: 'Forbidden',
                    },
                    404: {
                        description: 'Resource not found',
                    },
                },
            },
        },
    })
    @del('/{id}')
    @Errors.handleError
    async deleteBookmark(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;
        const id = parseInt(request.params.id);

        await this.deleteBookmarkAction.run(userData, id);

        return h.response().code(204);
    }

    @options({
        description: 'Share a bookmark',
        tags: ['api', 'bookmarks'],
        response: {
            schema: BookmarkValidator.shareResponse,
        },
        validate: {
            payload: BookmarkValidator.shareRequest,
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
    async share(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);
        const data = request.payload as any;
        const listOfUser = data.appUserIds as string[];

        const result = await this.shareBookmarkAction.run(
            id,
            listOfUser,
            userData
        );

        return h.response(result).code(201);
    }

    @options({
        description: 'Unshare a bookmark',
        tags: ['api', 'bookmarks'],
        validate: {
            payload: BookmarkValidator.shareRequest,
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
    async unshare(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);
        const data = request.payload as any;
        const listOfUser = data.appUserIds as string[];

        await this.unshareBookmarkAction.run(id, listOfUser, userData);

        return h.response().code(204);
    }
    @options({
        description: 'Get the Users with whom the bookmark is shared',
        tags: ['api', 'bookmarks'],
        response: {
            schema: BookmarkValidator.shareResponse,
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
    async getUsersWithClaimOnBookmark(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);

        const result = await this.getUsersWithClaimOnBookmarkAction.run(
            id,
            userData
        );

        return result;
    }
}
