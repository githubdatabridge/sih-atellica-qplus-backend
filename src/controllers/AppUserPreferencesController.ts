import { controller, options, put, route, get } from 'hapi-decorators';

import { BaseController } from './BaseController';
import { Request } from '@hapi/hapi';
import { autoInjectable } from 'tsyringe';
import { AppUserPreferencesRepository } from '../repositories';
import * as AppUserPreferencesValidator from '../validators/AppUserPreferencesValidator';
import Joi = require('joi');
import { AppUserPreferencesService } from '../services';
import { AppUserPreferences } from '../entities';
import * as Errors from '../lib/errors';
import { headerValidator } from '../validators/HeaderValidator';
import { QlikAuthData } from '../lib/qlik-auth';
import { QlikStrategies } from '../lib/strategies';
import { SCOPE } from '../lib';

@autoInjectable()
@controller('/app-user-preferences')
export class AppUserPreferencesController extends BaseController {
    constructor(
        private appUserPreferencesRepository?: AppUserPreferencesRepository,
        private appUserPreferencesService?: AppUserPreferencesService
    ) {
        super();
    }

    @options({
        description: 'Get the App User Preferences',
        tags: ['api', 'app-user-preferences'],
        response: {
            schema: AppUserPreferencesValidator.response,
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
    async get(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const appUserPreferences =
            await this.appUserPreferencesRepository.getAllWhere({
                appUserId: userData.user.appUserId,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
            });

        if (
            !appUserPreferences ||
            !appUserPreferences.length ||
            !appUserPreferences[0]
        ) {
            const defaultUserPreferences =
                this.appUserPreferencesService.createDefault(
                    userData.user.appUserId,
                    userData.customerId,
                    userData.tenantId,
                    userData.appId
                );

            return await this.appUserPreferencesRepository.create(
                defaultUserPreferences
            );
        }

        return appUserPreferences[0];
    }

    @options({
        description: 'Update App User Preferences',
        tags: ['api', 'app-user-preferences'],
        validate: {
            payload: AppUserPreferencesValidator.request,
            headers: headerValidator,
        },
        response: {
            schema: AppUserPreferencesValidator.response,
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
    @put('/')
    @Errors.handleError
    async update(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const requestData = request.payload as AppUserPreferences;

        const preferences = await this.appUserPreferencesRepository.getAllWhere(
            {
                appUserId: userData.user.appUserId,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
            }
        );

        if (!preferences || !preferences.length || !preferences[0]) {
            throw new Errors.NotFoundError('App User Preferences not found.', {
                method: 'UpdateAppUserPreferences',
                appUserId: userData.user.appUserId,
                customerId: userData.customerId,
                tenantId: userData.tenantId,
                appId: userData.appId,
            });
        }

        requestData.additionalPreferences = JSON.stringify(
            requestData.additionalPreferences
        );

        return await this.appUserPreferencesRepository.update(
            preferences[0].id,
            requestData,
            true
        );
    }
}
