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
import { DatasetRepository } from '../repositories';
import { BaseController } from './BaseController';
import * as DatasetValidator from '../validators/DatasetValidator';
import Joi = require('joi');
import { Dataset } from '../entities';
import { transformDataset } from '../transformers/reports/DatasetTransformer';
import { DatasetService } from '../services/DatasetService';
import * as Actions from '../actions/dataset';
import { headerValidator } from '../validators/HeaderValidator';
import { QlikAuthData } from '../lib/qlik-auth';
import { QlikStrategies } from '../lib/strategies';
import { paginatorQueryValidator } from '../validators/PaginatorValidator';
import { RestfulServiceFactory } from '../services';

@autoInjectable()
@controller('/datasets')
export class DatasetController extends BaseController {
    constructor(
        private datasetRepository?: DatasetRepository,
        private datasetService?: DatasetService,
        private updateDatasetAction?: Actions.UpdateDatasetAction,
        private createDatasetAction?: Actions.CreateDatasetAction,
        private deleteDatasetAction?: Actions.DeleteDatasetAction,
        private exportDatasetAction?: Actions.ExportDatasetAction,
        private restfulServiceFactory?: RestfulServiceFactory
    ) {
        super();
    }

    @options({
        description: 'Create dataset',
        tags: ['api', 'dataset'],
        response: {
            schema: DatasetValidator.dataset,
        },
        validate: {
            payload: DatasetValidator.createRequest,
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DS_WRITE],
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
                },
            },
        },
    })
    @post('/')
    @Errors.handleError
    async create(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const data = request.payload as Dataset;

        const result = await this.createDatasetAction.run(data, userData);
        const response = transformDataset(result);

        return h.response(response).code(201);
    }

    @options({
        description: 'Get all dataset',
        tags: ['api', 'dataset'],
        response: {
            schema: DatasetValidator.datasets,
        },
        validate: {
            query: paginatorQueryValidator.options({
                allowUnknown: true,
            }),
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DS_READ],
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
    async getAll(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const restfulService = this.restfulServiceFactory.create();

        restfulService
            .FilterDefs({
                id: ['eq', 'not'],
                title: ['eq', 'not', 'like'],
                qlikAppId: ['eq', 'not', 'like'],
                label: ['eq', 'not', 'like'],
                tags: ['eq', 'not', 'like'],
                appUserId: ['eq', 'not', 'like'],
                createdAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
                updatedAt: ['eq', 'lt', 'gt', 'lte', 'gte', 'not'],
            })
            .SearchDefs({
                title: ['eq', 'like'],
                qlikAppId: ['eq', 'like'],
                description: ['eq', 'like'],
                label: ['eq', 'like'],
                tags: ['eq', 'like'],
                appUserId: ['eq', 'like'],
            })
            .OrderByDefs(['createdAt', 'id', 'updatedAt', 'title'])
            .OrderByDefault('createdAt', 'desc');

        const page = parseInt(request.query.page as any);
        const perPage = parseInt(request.query.perPage as any);

        const pagination = {
            currentPage: page,
            perPage,
            isLengthAware: true,
        };
        const parse = restfulService.parse(request.query);
        const result = await this.datasetRepository.getAll(
            {
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
            },
            null,
            parse.filter,
            pagination,
            parse.orderBy,
            null,
            parse.search
        );

        const transformedData = result.data.map((dataset) => {
            dataset = this.datasetService.handleTextFields(dataset);
            dataset.qlikApp = this.datasetService.getQlikApp(
                dataset.qlikAppId,
                userData
            );
            return transformDataset(dataset);
        });

        return {
            data: transformedData,
            pagination: result.pagination,
            operators: restfulService.operator,
        };
    }

    @options({
        description: 'Get a single Dataset',
        tags: ['api', 'dataset'],
        response: {
            schema: DatasetValidator.dataset,
        },
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }),
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DS_READ],
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
    async getDatasetById(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;
        const id = parseInt(request.params.id);

        let result = await this.datasetRepository.findByID(id);

        if (
            !result ||
            result.customerId !== userData.customerId ||
            result.tenantId !== userData.tenantId ||
            result.appId !== userData.appId
        ) {
            throw new Errors.NotFoundError('Not found.', {
                method: 'GetDataset',
                datasetId: id,
                appUserId: userData.user.appUserId,
            });
        }

        result = this.datasetService.handleTextFields(result);
        result.qlikApp = this.datasetService.getQlikApp(
            result.qlikAppId,
            userData
        );
        const response = transformDataset(result);

        return response;
    }

    @options({
        description: 'Update Dataset',
        tags: ['api', 'dataset'],
        response: {
            schema: DatasetValidator.dataset,
        },
        validate: {
            payload: DatasetValidator.updateRequest,
            params: Joi.object({
                id: Joi.number().required(),
            }),
            query: Joi.object({
                cascade: Joi.bool().default(false),
            }),
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DS_WRITE],
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
                },
            },
        },
    })
    @put('/{id}')
    @Errors.handleError
    async update(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;
        const id = parseInt(request.params.id);
        const cascade = request.query.cascade;
        const datasetForUpdate = request.payload as Dataset;

        const result = await this.updateDatasetAction.run(
            id,
            datasetForUpdate,
            userData,
            cascade
        );
        const response = transformDataset(result);

        return response;
    }
    @options({
        description: 'Delete Dataset',
        tags: ['api', 'dataset'],
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }),
            query: Joi.object({
                cascade: Joi.bool().default(false),
            }),
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DS_WRITE],
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
                },
            },
        },
    })
    @del('/{id}')
    @Errors.handleError
    async deleteDataset(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;
        const id = parseInt(request.params.id);
        const cascade = request.query.cascade;

        await this.deleteDatasetAction.run(id, userData, cascade);

        return h.response().code(200);
    }

    @options({
        description: 'Get export of dataset',
        tags: ['api', 'dataset'],
        validate: {
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DS_WRITE],
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
                },
            },
        },
    })
    @get('/export')
    @Errors.handleError
    async export(_: Request, h: ResponseToolkit) {
        const userData = _.auth.credentials.userData as QlikAuthData;

        const file = await this.exportDatasetAction.run(userData);

        return h
            .response(file.data)
            .header(
                'Content-Disposition',
                `attachment; filename=${file.fileName}`
            )
            .type(file.contentType);
    }
}
