import { get, post, controller, options } from 'hapi-decorators';
import { BaseController } from './BaseController';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { autoInjectable } from 'tsyringe';
import * as AppUserValidator from '../validators/AppUserValidator';
import { AuthQlikAction } from '../actions/qlik/AuthQlikAction';
import * as Errors from '../lib/errors';
import { headerValidator } from '../validators/HeaderValidator';
import { transformMe } from '../transformers/me/meTransformer';
import { QlikAuthData } from '../lib/qlik-auth';
import { QlikStrategies } from '../lib/strategies';
import { SCOPE } from '../lib';

@autoInjectable()
@controller('/auth')
export class AuthController extends BaseController {
    constructor(private authQlikAction?: AuthQlikAction) {
        super();
    }

    @options({
        description: 'Get the currently logged in user (backend)',
        tags: ['api', 'auth'],
        response: {
            schema: AppUserValidator.meResponse,
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
    @get('/me')
    @Errors.handleError
    async me(request: Request) {
        const userData = request.auth.credentials.userData as QlikAuthData;
        return transformMe(userData);
    }

    @options({
        description: 'Qlik Auth',
        tags: ['api', 'auth'],
        response: {
            schema: AppUserValidator.authQlikResponse,
        },
        validate: {
            headers: headerValidator,
        },
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
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
    @post('/qlik')
    @Errors.handleError
    async qlikAuth(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData;
        const r = await this.authQlikAction.run(userData);
        return h.response(r.sessionId).code(200);
    }
}
