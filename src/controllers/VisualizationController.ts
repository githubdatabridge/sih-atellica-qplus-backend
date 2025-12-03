import { get, controller, options, post, route, put } from 'hapi-decorators';

import { BaseController } from './BaseController';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { autoInjectable } from 'tsyringe';

import * as VisualizationValidator from '../validators/VisualizationValidator';
import { VisualizationRepository } from '../repositories';
import { Visualization } from '../entities';
import Joi = require('joi');
import { paginatorQueryValidator } from '../validators/PaginatorValidator';
import * as Errors from '../lib/errors';
import { headerValidator } from '../validators/HeaderValidator';
import { QlikAuthData } from '../lib/qlik-auth';
import { QlikStrategies } from '../lib/strategies';
import { SCOPE } from '../lib';

@autoInjectable()
@controller('/visualizations')
export class VisualizationController extends BaseController {
    constructor(private visualizationRepository?: VisualizationRepository) {
        super();
    }

    @options({
        description: 'Add a visualization',
        tags: ['api', 'visualizations'],
        response: {
            schema: VisualizationValidator.visualization,
        },
        validate: {
            payload: VisualizationValidator.createRequest,
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

        const data = request.payload as Visualization;
        data.customerId = userData.customerId;
        data.tenantId = userData.tenantId;
        data.appId = userData.appId;

        return await this.visualizationRepository.create(data);
    }

    @options({
        description: 'List all visualizations',
        tags: ['api', 'visualizations'],
        response: {
            schema: VisualizationValidator.visualizations,
        },
        validate: {
            query: paginatorQueryValidator,
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

        return await this.visualizationRepository.getAll(
            {
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
            },
            null,
            null,
            pagination
        );
    }

    @options({
        description: 'Get a visualization',
        tags: ['api', 'visualizations'],
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

        const visualizations = await this.visualizationRepository.getAll({
            id,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });

        if (
            !visualizations ||
            !visualizations.data ||
            !visualizations.data.length
        ) {
            throw new Errors.NotFoundError('Visualization not found', {
                method: 'GetVisualizationByParams',
            });
        }

        return await visualizations.data[0];
    }

    @options({
        description: 'Get a visualization by params',
        tags: ['api', 'visualizations'],
        validate: {
            params: Joi.object({
                appId: Joi.string().required(),
                pageId: Joi.string().required(),
                componentId: Joi.string().required(),
            }).label('VisualizationParamsRequest'),
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
    @get('/{appId}/{pageId}/{componentId}')
    @Errors.handleError
    async getByParams(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const appId = request.params.appId;
        const pageId = request.params.pageId;
        const componentId = request.params.componentId;

        const visualizations = await this.visualizationRepository.getAll({
            pageId,
            componentId,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId,
        });

        if (
            !visualizations ||
            !visualizations.data ||
            !visualizations.data.length
        ) {
            throw new Errors.NotFoundError('Visualization not found', {
                method: 'GetVisualizationByParams',
            });
        }

        return visualizations.data[0];
    }

    @options({
        description: 'Removes a visualization',
        tags: ['api', 'visualizations'],
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

        const res = await this.visualizationRepository.deleteWhere({
            id,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });

        if (!res) {
            throw new Errors.NotFoundError('Visualization not found', {
                method: 'DeleteVisualization',
            });
        }

        return h.response().code(204);
    }
}
