import { get, controller, options, post, route, put } from 'hapi-decorators';

import { BaseController } from './BaseController';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { autoInjectable } from 'tsyringe';

import * as ReactionValidator from '../validators/ReactionValidator';
import { ReactionRepository } from '../repositories';
import { Reaction } from '../entities';
import Joi = require('joi');
import { CreateReactionAction } from '../actions/reaction/CreateReactionAction';
import { paginatorQueryValidator } from '../validators/PaginatorValidator';
import { UpdateReactionAction } from '../actions/reaction/UpdateReactionAction';
import * as Errors from '../lib/errors';
import { headerValidator } from '../validators/HeaderValidator';
import { NotifyOnReactionService, UserService } from '../services';
import { QlikAuthData } from '../lib/qlik-auth';
import { RestfulFilter, SCOPE } from '../lib';
import { AssignUser } from '../lib/util';
import { QlikStrategies } from '../lib/strategies';

@autoInjectable()
@controller('/reactions')
export class ReactionController extends BaseController {
    constructor(
        private reactionRepository?: ReactionRepository,
        private notifyService?: NotifyOnReactionService,
        private createReactionAction?: CreateReactionAction,
        private updateReactionAction?: UpdateReactionAction,
        private userService?: UserService
    ) {
        super();
    }

    @options({
        description: 'Add a reaction',
        tags: ['api', 'reactions'],
        response: {
            schema: ReactionValidator.reaction,
        },
        validate: {
            payload: ReactionValidator.createRequest,
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

        const data = request.payload as Reaction;
        data.customerId = userData.customerId;
        data.tenantId = userData.tenantId;
        data.appId = userData.appId;
        data.appUserId = userData.user.appUserId;

        return await this.createReactionAction.run(data, userData);
    }

    @options({
        description: 'List all reactions',
        tags: ['api', 'reactions'],
        response: {
            schema: ReactionValidator.reactions,
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
    async getAll(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const page = parseInt(request.query.page as any);
        const perPage = parseInt(request.query.perPage as any);

        const pagination = {
            currentPage: page,
            perPage,
            isLengthAware: true,
        };

        const filter = new RestfulFilter({
            id: ['eq'],
            appUserId: ['eq'],
            commentId: ['eq', 'not'],
            visualizationId: ['eq', 'not'],
            score: ['eq'],
            scope: ['eq'],
            createdAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            updatedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
        }).parse(request.query);

        const result = await this.reactionRepository.getAll(
            {
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
            },
            null,
            filter,
            pagination
        );
        result.data = await this.assignUserToReactions(result.data, userData);

        return result;
    }

    @options({
        description: 'Get a reaction',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
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
    @get('/{id}')
    @Errors.handleError
    async get(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);

        const reaction = await this.reactionRepository.getAll({
            id,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });

        if (!reaction || !reaction.data || !reaction.data.length) {
            throw new Errors.NotFoundError('Reaction not found', {
                method: 'GetSingleReaction',
            });
        }

        return await this.assignUserToReaction(reaction.data[0], userData);
    }

    @options({
        description: 'Removes a reaction',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
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
    @route('delete', '/{id}')
    @Errors.handleError
    async delete(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);

        const reaction = await this.assignUserToReaction(
            await this.reactionRepository.findByID(id),
            userData
        );

        if (!reaction) {
            throw new Errors.NotFoundError('Reaction not found', {
                method: 'DeleteReaction',
            });
        }

        const res = await this.reactionRepository.deleteWhere({
            id,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });

        if (!res) {
            throw new Errors.NotFoundError('Reaction not found', {
                method: 'DeleteReaction',
            });
        }

        this.notifyService.notifyReactionCountChanged(
            reaction.appUserId,
            userData.customerId,
            userData.tenantId,
            userData.appId,
            reaction.visualizationId
        );

        return h.response().code(204);
    }

    @options({
        description: 'Get reaction by commentId, userId and scope',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                commentId: Joi.number().required(),
                appUserId: Joi.string().required(),
                scope: Joi.string().required(),
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
    @get('/{commentId}/{appUserId}/{scope}')
    @Errors.handleError
    async getByParams(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const commentId = parseInt(request.params.commentId);
        const appUserId = request.params.appUserId;
        const scope = request.params.scope;

        const reactions = await this.reactionRepository.getAll({
            commentId,
            appUserId,
            scope,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });

        if (!reactions.data || !reactions.data.length) {
            throw new Errors.NotFoundError('Reaction not found', {
                method: 'DeleteReaction',
            });
        }

        return await this.assignUserToReaction(reactions.data[0], userData);
    }

    @options({
        description: 'Update a reaction',
        tags: ['api', 'reactions'],
        response: {
            schema: ReactionValidator.reaction,
        },
        validate: {
            payload: ReactionValidator.updateRequest,
            params: Joi.object({
                id: Joi.number().required(),
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
    @put('/{id}')
    @Errors.handleError
    async update(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const data = request.payload as Reaction;
        const id = parseInt(request.params.id);

        return await this.updateReactionAction.run(id, data, userData);
    }

    @options({
        description: 'Count reactions on a single visualization',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                scope: Joi.string().required(),
                visualizationId: Joi.number().required(),
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
    @get('/visualization/count/{scope}/{visualizationId}')
    @Errors.handleError
    async countReactionsOnVisualization(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const visualizationId = parseInt(request.params.visualizationId);
        const scope = request.params.scope;

        const reactions = await this.reactionRepository.getAll({
            scope,
            visualizationId,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });

        return {
            count: reactions.data.length,
        };
    }

    @options({
        description: 'Count reactions with hash on a single visualization',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                scope: Joi.string().required(),
                visualizationId: Joi.number().required(),
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
    @get('/visualization/count/hash/{scope}/{visualizationId}')
    @Errors.handleError
    async countReactionsOnVisualizationWithHash(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const visualizationId = parseInt(request.params.visualizationId);
        const scope = request.params.scope;

        return await this.reactionRepository.countReactionsOnVisualizationWithHash(
            scope,
            visualizationId,
            userData.customerId,
            userData.tenantId,
            userData.appId
        );
    }

    @options({
        description: 'Return array of scores with nested selection hash array',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                scope: Joi.string().required(),
                visualizationId: Joi.number().required(),
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
    @get('/score/hash/{scope}/{visualizationId}')
    @Errors.handleError
    async getReactionsOnVisualizationByScoreAndHash(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const visualizationId = parseInt(request.params.visualizationId);
        const scope = request.params.scope;

        return await this.reactionRepository.getReactionsOnVisualizationByScoreAndHash(
            scope,
            visualizationId,
            userData.customerId,
            userData.tenantId,
            userData.appId
        );
    }

    @options({
        description: 'Return array of scores for comments',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                scope: Joi.string().required(),
                commentId: Joi.number().required(),
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
    @get('/score/comment/{scope}/{commentId}')
    @Errors.handleError
    async getReactionsOnCommentsByScore(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const commentId = parseInt(request.params.commentId);
        const scope = request.params.scope;

        return await this.reactionRepository.getReactionsOnCommentsByScore(
            scope,
            commentId,
            userData.customerId,
            userData.tenantId,
            userData.appId
        );
    }

    @options({
        description: 'Return array of sentiments by scope and visualization',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                scope: Joi.string().required(),
                visualizationId: Joi.number().required(),
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
    @get('/visualization/sentiment/{scope}/{visualizationId}')
    @Errors.handleError
    async getSentimentsByScopeAndVisualizationId(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const visualizationId = parseInt(request.params.visualizationId);
        const scope = request.params.scope;

        return await this.reactionRepository.getSentimentsByScopeAndVisualizationId(
            scope,
            visualizationId,
            userData.customerId,
            userData.tenantId,
            userData.appId
        );
    }

    @options({
        description: 'Get reactions by scope and visualization',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                scope: Joi.string().required(),
                visualizationId: Joi.number().required(),
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
    @get('/visualization/{scope}/{visualizationId}')
    @Errors.handleError
    async getReactionsByScopeAndVisualizationId(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const visualizationId = parseInt(request.params.visualizationId);
        const scope = request.params.scope;

        const result = await this.reactionRepository.getAll({
            scope,
            visualizationId,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });
        result.data = await this.assignUserToReactions(result.data, userData);

        return result;
    }

    @options({
        description: 'Get reactions by scope, visualization and score',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                scope: Joi.string().required(),
                visualizationId: Joi.number().required(),
                score: Joi.number().required(),
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
    @get('/visualization/{scope}/{visualizationId}/{score}')
    @Errors.handleError
    async getReactionsBySentimentAndVisualization(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const visualizationId = parseInt(request.params.visualizationId);
        const score = parseInt(request.params.score);
        const scope = request.params.scope;

        const users = await this.userService.getAllUsersInfo(userData);

        const result = await this.reactionRepository.getAllWhereByQsUserId({
            scope,
            visualizationId,
            score,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });

        result.forEach((item) => {
            const user = AssignUser(item.appUserId, users);
            item.reactions.forEach((reaction) => {
                reaction.user = user;
            });
        });

        return result;
    }

    @options({
        description: 'Count reactions on comment entity',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                scope: Joi.string().required(),
                commentId: Joi.number().required(),
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
    @get('/comment/count/{scope}/{commentId}')
    @Errors.handleError
    async countReactionsByComment(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const commentId = parseInt(request.params.commentId);
        const scope = request.params.scope;

        const reactionCount =
            await this.reactionRepository.countReactionsByComment(
                scope,
                commentId,
                userData.customerId,
                userData.tenantId,
                userData.appId
            );

        return {
            count: reactionCount,
        };
    }

    @options({
        description: 'Count reactions with hash on comment entity',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                scope: Joi.string().required(),
                commentId: Joi.number().required(),
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
    @get('/comment/count/hash/{scope}/{commentId}')
    @Errors.handleError
    async countReactionsOnCommentsWithHash(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const commentId = parseInt(request.params.commentId);
        const scope = request.params.scope;

        const data =
            await this.reactionRepository.countReactionsOnCommentsWithHash(
                scope,
                commentId,
                userData.customerId,
                userData.tenantId,
                userData.appId
            );

        return data;
    }

    @options({
        description: 'Return array of sentiments by scope and comment',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                scope: Joi.string().required(),
                commentId: Joi.number().required(),
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
    @get('/comment/sentiments/{scope}/{commentId}')
    @Errors.handleError
    async getSentimentsByScopeAndCommentId(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const commentId = parseInt(request.params.commentId);
        const scope = request.params.scope;

        const data =
            await this.reactionRepository.getSentimentsByScopeAndCommentId(
                scope,
                commentId,
                userData.customerId,
                userData.tenantId,
                userData.appId
            );

        return data;
    }

    @options({
        description: 'Get reactions by scope and comment',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                scope: Joi.string().required(),
                commentId: Joi.number().required(),
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
    @get('/comment/{scope}/{commentId}')
    @Errors.handleError
    async getReactionsByScopeAndCommentId(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const commentId = parseInt(request.params.commentId);
        const scope = request.params.scope;

        const reactions = await this.reactionRepository.getAll({
            commentId,
            scope,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });

        if (!reactions || !reactions.data || !reactions.data.length) {
            throw new Errors.NotFoundError('Reaction not found', {
                method: 'getReactionsByScopeAndCommentId',
            });
        }

        return await this.assignUserToReaction(reactions.data[0], userData);
    }

    @options({
        description: 'Get reactions by scope, comment and score',
        tags: ['api', 'reactions'],
        validate: {
            params: Joi.object({
                scope: Joi.string().required(),
                commentId: Joi.number().required(),
                score: Joi.string().required(),
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
    @get('/comment/{scope}/{commentId}/{score}')
    @Errors.handleError
    async getReactionsBySentimentAndComment(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const commentId = parseInt(request.params.commentId);
        const scope = request.params.scope;
        const score = parseInt(request.params.score);

        const users = await this.userService.getAllUsersInfo(userData);

        const result = await this.reactionRepository.getAllWhereByQsUserId({
            scope,
            commentId,
            score,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });

        result.forEach((item) => {
            const user = AssignUser(item.appUserId, users);

            item.reactions.forEach((reaction) => {
                reaction.user = user;
            });
        });

        return result;
    }

    async assignUserToReaction(data: Reaction, userData: QlikAuthData) {
        const result = { ...data };
        const users = await this.userService.getAllUsersInfo(userData);

        result.user = AssignUser(result.appUserId, users);
        return result;
    }

    async assignUserToReactions(data: Reaction[], userData: QlikAuthData) {
        const result = [...data];

        const users = await this.userService.getAllUsersInfo(userData);

        result.forEach((reaction) => {
            reaction.user = AssignUser(reaction.appUserId, users);
        });

        return result;
    }
}
