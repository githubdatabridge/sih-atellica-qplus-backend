import { boomHandleError } from '../errors';
import { container } from 'tsyringe';
import {
    ConfigService,
    IAuthProvider,
    QlikAuthProviderFactory,
} from '../../services';
import { Plugin, Request, ResponseToolkit } from '@hapi/hapi';
import { Errors } from '..';
import * as Jwt from '@hapi/jwt';
import { getTokenCertificates } from '../../server-certificates';
import { QlikStrategies } from '../strategies';

const QlikJwt: Plugin<any> = {
    name: 'QlikJwt',
    version: '0.1',
    register: async function (server, options) {
        await server.register(Jwt);
        const configService = container.resolve(ConfigService);
        const key = getTokenCertificates().key;

        server.auth.strategy(QlikStrategies.QsaasJwt, 'jwt', {
            keys: [
                {
                    key: key,
                },
            ],
            verify: {
                iss: configService.get('JWT_ISSUER'),
                aud: configService.get('JWT_AUDIENCE'),
                sub: false,
                nbf: true,
                exp: true,
            },
            validate: async (
                artifacts,
                request: Request,
                h: ResponseToolkit
            ) => {
                const factoryProvider = container.resolve(
                    QlikAuthProviderFactory
                );

                try {
                    const tenantId = request.headers['x-tenant-id'];
                    const customerId = request.headers['x-customer-id'];
                    const mashupAppName = request.headers['x-app-name'];

                    const payload = artifacts.decoded.payload;

                    if (!tenantId) {
                        throw new Error('tenantId is missing from headers.');
                    }

                    if (tenantId !== payload.tenantId) {
                        throw new Error('Tenant not valid on jwt token.');
                    }

                    if (customerId !== payload.customerId) {
                        throw new Error('Customer not valid on jwt token.');
                    }

                    if (mashupAppName !== payload.mashupAppName) {
                        throw new Error(
                            'MashupApp name not valid on jwt token.'
                        );
                    }

                    const provider = factoryProvider.create(tenantId);

                    const userData = await provider.ensureQlikUser(
                        request.state,
                        request.headers
                    );

                    return {
                        isValid: true,
                        credentials: { userData, scope: userData.roles },
                    };
                } catch (error) {
                    if (error instanceof Errors.BaseError) {
                        boomHandleError(error, true);
                    } else {
                        boomHandleError(
                            new Errors.Unauthorized('Unauthorized', {
                                innerMessage: error.message,
                            }),
                            true
                        );
                    }
                }
            },
        });
    },
};
export { QlikJwt };
