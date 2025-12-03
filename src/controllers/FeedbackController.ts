import { get, controller, options, post, put, route } from 'hapi-decorators';

import { BaseController } from './BaseController';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { autoInjectable } from 'tsyringe';

import { FeedbackRepository } from '../repositories';
import * as FeedbackValidator from '../validators/FeedbackValidator';
import Joi = require('joi');
import { Feedback } from '../entities';
import * as Errors from '../lib/errors';
import { headerValidator } from '../validators/HeaderValidator';
import { NotifyOnFeedbackService } from '../services';
import { QlikAuthData } from '../lib/qlik-auth';
import { QlikStrategies } from '../lib/strategies';
import { SCOPE } from '../lib';

@autoInjectable()
@controller('/feedbacks')
export class FeedbackController extends BaseController {
    constructor(
        private feedbackRepository?: FeedbackRepository,
        private notifyService?: NotifyOnFeedbackService
    ) {
        super();
    }

    @options({
        description: 'Create feedback',
        tags: ['api', 'feedbacks'],
        validate: {
            payload: FeedbackValidator.create,
            headers: headerValidator,
        },
        response: {
            schema: FeedbackValidator.response,
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

        const requestData = request.payload as Feedback;
        requestData.appUserId = userData.user.appUserId;
        requestData.customerId = userData.customerId;
        requestData.tenantId = userData.tenantId;
        requestData.appId = userData.appId;

        const responseData = await this.feedbackRepository.create(requestData);

        this.notifyService.NotifyOnFeedbackCreated(userData, requestData);

        return responseData;
    }

    @options({
        description: 'Get all feedbacks',
        tags: ['api', 'feedbacks'],
        response: {
            schema: FeedbackValidator.feedbacks,
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

        return await this.feedbackRepository.getAllWhere({
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
        });
    }

    @options({
        description: 'Get single feedback',
        tags: ['api', 'feedbacks'],
        response: {
            schema: FeedbackValidator.response,
        },
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
    async getSingleFeedback(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const id = parseInt(request.params.id);

        const response = await this.feedbackRepository.getAllWhere({
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
            id,
        });

        if (!response || !response.length || !response[0]) {
            throw new Errors.NotFoundError('Feedback not found', {
                method: 'getSingleFeedback',
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                feedbackId: id,
            });
        }

        return response[0];
    }

    @options({
        description: 'Updates a feedback',
        tags: ['api', 'feedbacks'],
        response: {
            schema: FeedbackValidator.response,
        },
        validate: {
            payload: FeedbackValidator.update,
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

        const data = request.payload as Feedback;
        const id = parseInt(request.params.id);

        const feedback = await this.feedbackRepository.getAllWhere({
            id,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
            appUserId: userData.user.appUserId,
        });

        if (!feedback || !feedback.length || !feedback[0]) {
            throw new Errors.NotFoundError('Feedback not found', {
                method: 'updateFeedback',
                feedbackId: id,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserId: userData.user.appUserId,
            });
        }

        return await this.feedbackRepository.update(id, data, true);
    }

    @options({
        description: 'Removes a feedback',
        tags: ['api', 'feedbacks'],
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

        const res = await this.feedbackRepository.deleteWhere({
            id,
            customerId: userData.customerId,
            tenantId: userData.tenantId,
            appId: userData.appId,
            appUserId: userData.user.appUserId,
        });

        if (!res) {
            throw new Errors.NotFoundError('Feedback not found', {
                method: 'deleteFeedback',
                feedbackId: id,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
                appUserId: userData.user.appUserId,
            });
        }

        return h.response().code(204);
    }
}
