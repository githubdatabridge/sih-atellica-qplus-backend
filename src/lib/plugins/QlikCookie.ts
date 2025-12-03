import { boomHandleError } from '../errors';
import { container } from 'tsyringe';
import { QlikAuthProviderFactory } from '../../services';
import { Plugin, Request, ResponseToolkit } from '@hapi/hapi';
import { headerValidator } from '../../validators/HeaderValidator';
import { Errors } from '..';
import { QlikStrategies } from '../strategies';

const QlikCookie: Plugin<any> = {
    name: 'QlikCookie',
    version: '0.1',
    register: function (server, options) {
        const qlikCookieScheme = function (server, options) {
            return {
                authenticate: async function (
                    request: Request,
                    h: ResponseToolkit
                ) {
                    try {
                        await headerValidator.validateAsync(request.headers);

                        const tenantId = request.headers['x-tenant-id'];

                        const authProviderFactory = container.resolve(
                            QlikAuthProviderFactory
                        );

                        const provider = authProviderFactory.create(tenantId);

                        const userData = await provider.ensureQlikUser(
                            request.state,
                            request.headers
                        );

                        return h.authenticated({
                            credentials: { userData, scope: userData.scopes },
                        });
                    } catch (error) {
                        boomHandleError(
                            new Errors.Unauthorized('Unauthorized', {
                                innerError: error,
                                innerErrorMessage: error.message,
                            }),
                            true
                        );
                    }
                },
            };
        };
        server.auth.scheme('qlik_cookie_sessionId', qlikCookieScheme);
        server.auth.strategy(QlikStrategies.QesCookie, 'qlik_cookie_sessionId');
    },
};
export { QlikCookie };
