import { controller, get, options } from 'hapi-decorators';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { autoInjectable } from 'tsyringe';
import { BaseController } from './BaseController';
import * as Errors from '../lib/errors';
import { QlikAuthData } from '../lib/qlik-auth';
import { QlikAuthProviderFactory } from '../services';
import { usersResponse } from '../validators/UserValidator';
import { headerValidator } from '../validators/HeaderValidator';
import { QlikStrategies } from '../lib/strategies';
import { SCOPE } from '../lib';

@autoInjectable()
@controller('/users')
export class UserController extends BaseController {
    constructor(private providerFactory?: QlikAuthProviderFactory) {
        super();
    }

    @options({
        description: 'Get the list of qlik users',
        tags: ['api', 'users'],
        auth: {
            strategies: [QlikStrategies.QsaasJwt, QlikStrategies.QesCookie],
            scope: [SCOPE.DEFAULT],
        },
        response: {
            schema: usersResponse,
        },
        validate: {
            headers: headerValidator,
        },
    })
    @get('/')
    @Errors.handleError
    async notify(request: Request, _h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const provider = this.providerFactory.create(userData.tenantId);

        const result = await provider.getUserFullList(userData);

        return result;
    }
}
