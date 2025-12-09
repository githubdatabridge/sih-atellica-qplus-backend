import { get, controller, options } from 'hapi-decorators';
import { BaseController } from './BaseController';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { autoInjectable } from 'tsyringe';
import * as Errors from '../lib/errors';
import Joi = require('joi');
import { TenantRepository } from '../repositories';
import { generateJwtToken } from '../lib/jwtHelpers';
import {
    ConfigService,
    QlikAuthProviderFactory,
    QlikAuthType,
    QlikService,
} from '../services';
import { QlikStrategies } from '../lib/strategies';
import { QlikAuthData } from '../lib/qlik-auth';
import { boomHandleError } from '../lib/errors';
import { headerValidator } from '../validators/HeaderValidator';
import { v4 } from 'uuid';
import { secondsSinceUnixEpoch } from '../lib/util';
import { TextDecoder } from 'util';

@autoInjectable()
@controller('/qlik')
export class QlikController extends BaseController {
    constructor(
        private configService?: ConfigService,
        private tenantRepository?: TenantRepository,
        private qlikService?: QlikService,
        private providerFactory?: QlikAuthProviderFactory
    ) {
        super();
    }

    @options({
        description: 'login using cloud host',
        tags: ['api', 'login'],
        validate: {
            query: Joi.object({
                returnTo: Joi.string().optional().label('ReturnToUrlString'),
                tenantId: Joi.string().optional().label('TenantIdString'),
                customerId: Joi.string().optional().label('CustomerIdString'),
                mashupAppName: Joi.string().optional().label('MashupAppNameString'),
                code: Joi.string().optional().label('AuthCodeString'),
                state: Joi.string().optional().label('AuthStateString'),
            })
                .options({ allowUnknown: true })
                .label('QlikAuthQueryParams'),
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    302: {
                        description: 'Redirect',
                    },
                    400: {
                        description: 'Bad request',
                    },
                    500: {
                        description: 'Internal error',
                    },
                },
            },
        },
        auth: {
            strategy: QlikStrategies.QlikMultiIdp,
            mode: 'try',
        },
    })
    @get('/saas/jwt/login')
    @Errors.handleError
    async login(request: Request, h: ResponseToolkit) {
        if (!request.auth.isAuthenticated) {
            throw new Errors.InternalError(
                `Authentication failed due to: ${request.auth.error.message}`,
                {
                    errorOutputError:
                        request.auth.error['data']?.output?.payload.error ||
                        'No output or data',
                    errorOutputMessage:
                        request.auth.error['data']?.output?.payload.message ||
                        'No output or data',
                    errorOutputStatusCode:
                        request.auth.error['data']?.output?.payload
                            .statusCode || 'No output or data',
                    errorDataCode:
                        request.auth.error['data']?.code || 'No data',
                    errorDataMessage:
                        request.auth.error['data']?.message || 'No data',
                    errorDataPayload: this.authErrorPayload(
                        request.auth.error['data']?.payload
                    ),
                }
            );
        }

        const {
            returnTo,
            callbackUrl,
            tenantId,
            customerId,
            mashupAppName,
            tokenOptions,
        } = request.state.helper_sid;

        const profile = request.auth.credentials.profile as any;
        const token = generateJwtToken(
            {
                sub: profile.sub,
                subType: profile.subType,
                status: profile.status,
                name: profile.name,
                email: profile.email,
                userId: profile.userId,
                email_verified: profile.email_verified,
                groups: profile.groups,
                access_token: this.getAccess_token(request),
                tenantId,
                customerId,
                mashupAppName,
                JWT_ID: v4(),
                notBefore: secondsSinceUnixEpoch(),
            },
            {
                ...tokenOptions,
                expiresIn: parseInt(this.configService.get('JWT_EXPIRES_IN')),
                issuer: this.configService.get('JWT_ISSUER'),
                audience: this.configService.get('JWT_AUDIENCE'),
            }
        );

        h.unstate('helper_sid');

        return h.redirect(
            `${callbackUrl}?returnTo=${encodeURIComponent(
                returnTo
            )}&token=${token}`
        );
    }

    private getAccess_token(request: Request): string {
        return this.configService.get('QLIK_CLOUD_INCLUDE_ACCESS_TOKEN', true)
            ? (request.auth.artifacts.access_token as string)
            : 'none';
    }

    @options({
        description: 'logout user from qlik.',
        tags: ['api', 'logout'],
        plugins: {
            'hapi-swagger': {
                responses: {
                    302: {
                        description: 'Redirect',
                    },
                    400: {
                        description: 'Bad request',
                    },
                    500: {
                        description: 'Internal error',
                    },
                },
            },
        },
        auth: false,
    })
    @get('/saas/jwt/logout')
    @Errors.handleError
    async logout(request: Request, h: ResponseToolkit) {
        if (!request.state.helper_logout_sid) {
            throw new Errors.Unauthorized('Missing required cookie', {
                state: JSON.stringify(request.state),
            });
        }

        const {
            authProviderType,
            tenantId,
            customerId,
            appId,
            sessionId,
            vp,
            callbackUrl,
        } = request.state.helper_logout_sid;

        if (!authProviderType) {
            throw new Errors.Unauthorized('Missing required cookie type', {
                state: JSON.stringify(request.state),
            });
        }

        const provider = this.providerFactory.create(tenantId);
        h.unstate('helper_logout_sid');

        try {
            if (authProviderType === QlikAuthType.Cloud) {
                return this.handleCloudLogout(tenantId, h);
            } else if (authProviderType === QlikAuthType.Windows) {
                await provider.handleLogout(vp, sessionId, tenantId);
            } else {
                throw new Errors.InternalError(
                    `QlikAuthType method not implemented.`,
                    {
                        authProviderType,
                    }
                );
            }

            return h.redirect(`${callbackUrl}?logout=true`);
        } catch (error) {
            boomHandleError(error, false);
            return h.redirect(
                `${callbackUrl}?error=${encodeURIComponent(error.message)}`
            );
        }
    }

    private handleCloudLogout(tenantId, h: ResponseToolkit) {
        const tenant = this.tenantRepository
            .getAll()
            .find((x) => x.id === tenantId);
        //WORKAROUND
        return h.redirect(`https://${tenant.host}/logout`);
    }

    @options({
        description: 'preflight - logout user from qlik.',
        tags: ['api', 'logout'],
        validate: {
            headers: headerValidator,
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
                    500: {
                        description: 'Internal error',
                    },
                },
            },
        },
        auth: {
            strategies: [QlikStrategies.QesCookie, QlikStrategies.QsaasJwt],
        },
    })
    @get('/saas/jwt/logout/preflight')
    @Errors.handleError
    async logoutPreflight(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;
        let qlikSessionId;

        if (userData.authProviderType === QlikAuthType.Windows) {
            const qlikSessionHeader = this.tenantRepository.getSessionHeaders(
                userData.authProviderType
            )[0];
            qlikSessionId =
                request.state[`${qlikSessionHeader}-${userData.vp}`];
        }

        const app = this.tenantRepository.getAppByAppId(
            userData.tenantId,
            userData.customerId,
            userData.appId
        );

        h.state('helper_logout_sid', {
            authProviderType: userData.authProviderType,
            tenantId: userData.tenantId,
            customerId: userData.customerId,
            appId: userData.appId,
            sessionId: qlikSessionId,
            vp: userData.vp,
            callbackUrl: app.callbackUrl,
        });

        return h.response().code(204);
    }

    @options({
        description: 'Check if user session is active for qlik sense.',
        tags: ['api', 'active'],
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
        auth: {
            strategies: [QlikStrategies.QesCookie],
        },
        validate: {
            headers: headerValidator,
        },
    })
    @get('/is-active')
    @Errors.handleError
    async isActive(request: Request, h: ResponseToolkit) {
        const userData = request.auth.credentials.userData as QlikAuthData;

        const qlikSessionHeader = this.tenantRepository.getSessionHeaders(
            userData.authProviderType
        )[0];

        const tenant = this.tenantRepository
            .getAll()
            .find((x) => x.id === userData.tenantId);

        const qlikSessionId =
            request.state[`${qlikSessionHeader}-${userData.vp}`];

        await this.qlikService.isSessionActive(qlikSessionId, {
            qsInfo: {
                host: tenant.host,
                qrsPort: tenant.port,
                vp: userData.vp,
            },
        });

        return h.response().code(200);
    }

    authErrorPayload(payload: any): string {
        if (payload) return 'No data payload.';
        // create an array view of some valid bytes
        const bytesView = new Uint8Array(payload);
        // encoding can be specfied, defaults to utf-8
        const str = new TextDecoder().decode(bytesView);
        return str;
    }
}
