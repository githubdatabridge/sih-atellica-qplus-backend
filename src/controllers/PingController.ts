import { get, controller, options } from 'hapi-decorators';

import { BaseController } from './BaseController';
import { Request } from '@hapi/hapi';
import { autoInjectable } from 'tsyringe';
import { PongService } from '../services';

import * as PingValidator from '../validators/PingValidator';
import * as Errors from '../lib/errors';

@autoInjectable()
@controller('/ping')
export class PingController extends BaseController {
    constructor(private pongService?: PongService) {
        super();
    }

    @options({
        description: 'Ping the service',
        tags: ['api', 'ping'],
        response: {
            schema: PingValidator.response,
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
    ping(_request: Request) {
        return {
            ping: this.pongService.pong(),
        };
    }
}
