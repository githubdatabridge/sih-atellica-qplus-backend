import { Request, ResponseToolkit } from '@hapi/hapi';
import Joi = require('joi');
import { get, controller, options, post, route, patch } from 'hapi-decorators';
import { autoInjectable } from 'tsyringe';
import { BaseController } from './BaseController';
import {
    CreatePinWallAction,
    UpdatePinWallAction,
    GetAllPinWallsAction,
} from '../actions/pin-walls';
import * as PinWallValidator from '../validators/PinWallValidator';
import * as CommonValidator from '../validators/CommonValidator';
import { PinWallRepository } from '../repositories/PinWallRepository';
import { PinWall } from '../entities';
import {
    PinWallQlikStateRepository,
    QlikStateRepository,
} from '../repositories';
import * as Errors from '../lib/errors';
import { RestfulFilter, SCOPE } from '../lib';
import { headerValidator } from '../validators/HeaderValidator';
import { QlikAuthData } from '../lib/qlik-auth';
import { QlikStrategies } from '../lib/strategies';
import {
    GetFiltersForPinWallAction,
    GetFiltersForPinWallData,
} from '../actions/pin-walls/GetFiltersForPinWallAction';

@autoInjectable()
@controller('/pin-walls')
export class PinWallController extends BaseController {
    constructor(
        private pinwallRepository?: PinWallRepository,
        private createPinWallAction?: CreatePinWallAction,
        private updatePinWallAction?: UpdatePinWallAction,
        private getAllPinWallsAction?: GetAllPinWallsAction,
        private getFiltersForPinWallAction?: GetFiltersForPinWallAction,
        private pinwallQlikStateRepository?: PinWallQlikStateRepository,
        private qlikStateRepository?: QlikStateRepository
    ) {
        super();
    }

    @options({
        description: 'Adds a Pin Wall',
        tags: ['api', 'pin-walls'],
        response: {
            schema: PinWallValidator.response,
        },
        validate: {
            payload: PinWallValidator.createRequest,
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

        const data = request.payload as PinWall;

        data.customerId = userData.customerId;
        data.tenantId = userData.tenantId;
        data.appId = userData.appId;
        data.appUserId = userData.user.appUserId;

        return await this.createPinWallAction.run(data);
    }

    @options({
        description: 'Updates a Pin Wall',
        tags: ['api', 'pin-walls'],
        response: {
            schema: PinWallValidator.response,
        },
        validate: {
            params: Joi.object({
                id: Joi.number().required(),
            }).label('IdParams'),
            payload: PinWallValidator.update,
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

        const id = parseInt(request.params.id);
        const data = request.payload as PinWall;

        data.id = id;
        data.customerId = userData.customerId;
        data.tenantId = userData.tenantId;
        data.appId = userData.appId;
        data.appUserId = userData.user.appUserId;

        return await this.updatePinWallAction.run(data);
    }

    @options({
        description: 'List all Pin Walls',
        tags: ['api', 'pin-walls'],
        response: {
            schema: PinWallValidator.responseArray,
        },
        validate: {
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

        const filter = new RestfulFilter({
            id: ['eq'],
            appUserId: ['eq'],
            isFavourite: ['eq'],
        }).parse(request.query);

        return await this.getAllPinWallsAction.run(userData, filter);
    }

    @options({
        description: 'Get a single Pin Wall',
        tags: ['api', 'pin-walls'],
        response: {
            schema: PinWallValidator.response,
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
        const pinwalls = await this.pinwallRepository.getAllWhere({
            id,
            appUserId: userData.user.appUserId,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });

        if (!pinwalls || !pinwalls.length) {
            throw new Errors.NotFoundError('Get a single Pin Wall', {
                pinwallId: id,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserId: userData.user.appUserId,
            });
        }

        const pinwallQlikStates =
            await this.pinwallQlikStateRepository.findAllIn(
                [pinwalls[0].id],
                'pinwallId'
            );

        const qlikStateIds = pinwallQlikStates.map((n) => n.qlikStateId);
        const qlikStates = await this.qlikStateRepository.findAllIn(
            qlikStateIds,
            'id'
        );

        pinwalls[0].qlikState = qlikStates || [];

        try {
            pinwalls[0].content = JSON.parse(pinwalls[0].content);
        } catch (error) {
            throw new Errors.BadDataError('Get a single Pin Wall', {
                pinwallId: id,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserId: userData.user.appUserId,
                data: pinwalls[0].content,
            });
        }

        return pinwalls[0];
    }

    @options({
        description: 'Removes a Pin Wall',
        tags: ['api', 'pin-walls'],
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
    @route('delete', '/{id}')
    @Errors.handleError
    async delete(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);

        const pinwall = await this.pinwallRepository.findByID(id);

        if (!pinwall) {
            return h.response().code(404);
        }

        const pinwallQlikStates =
            await this.pinwallQlikStateRepository.getAllWhere({
                pinwallId: pinwall.id,
            });

        const qlikStateIds = pinwallQlikStates.map((n) => n.qlikStateId);

        await this.qlikStateRepository.deleteWhereIn('id', qlikStateIds);
        await this.pinwallQlikStateRepository.deleteWhere({
            pinwallId: pinwall.id,
        });

        await this.pinwallQlikStateRepository;
        await this.pinwallRepository.deleteWhere({
            id,
            appUserId: userData.user.appUserId,
        });

        return h.response().code(204);
    }

    @options({
        description: 'Get all filters for a Pin Wall',
        tags: ['api', 'pin-walls'],
        response: {
            schema: CommonValidator.dictionaryOfStrings,
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
    @get('/{id}/filters')
    @Errors.handleError
    async getFilters(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);

        const data: GetFiltersForPinWallData = {
            id,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
            appUserId: userData.user.appUserId,
        };

        const result = await this.getFiltersForPinWallAction.run(data);

        return h.response(result).code(200);
    }
}
