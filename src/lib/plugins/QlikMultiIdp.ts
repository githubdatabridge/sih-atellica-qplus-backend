import { boomHandleError } from '../errors';
import { container } from 'tsyringe';
import { Plugin, Request, ResponseToolkit } from '@hapi/hapi';
import { ConfigService } from '../../services';
import { Errors } from '..';
import { Tenant } from '../../entities';
import { TenantRepository } from '../../repositories';
import { QlikStrategies } from '../strategies';
import {
    AxiosInstanceType,
    axiosClassicInstance,
    axiosInstance,
    jwtTokenDecode,
} from '../util';

const QlikMultiIdp: Plugin<any> = {
    name: 'QlikMultiIdp',
    version: '0.1',
    register: function (server, options) {
        const qlikMultiIdpScheme = function (server, options) {
            const configService = container.resolve(ConfigService);
            const tenantRepository = container.resolve(TenantRepository);

            const PASSWORD = configService.get('STATE_SECRET');
            const IS_SECURE =
                configService.get('NODE_ENV') === 'production' ||
                configService.get('NODE_ENV') === 'staging';

            // Session cookie needed for Bell
            // Unstate after login complines
            server.state('qc_sid', {
                clearInvalid: true,
                domain: undefined,
                encoding: 'iron',
                ignoreErrors: true,
                isHttpOnly: true,
                isSameSite: 'Strict',
                isSecure: IS_SECURE,
                password: PASSWORD,
                path: '/',
                ttl: undefined,
            });

            // Session cookie needed for returnTo after login
            // Unstate after login complines
            server.state('helper_sid', {
                clearInvalid: true,
                domain: undefined,
                encoding: 'iron',
                password: PASSWORD,
                ignoreErrors: true,
                isHttpOnly: true,
                isSameSite: 'Lax',
                isSecure: IS_SECURE,
                path: '/',
                ttl: undefined,
            });

            // Session cookie needed for logout
            // Unstate after logout complines
            server.state('helper_logout_sid', {
                clearInvalid: true,
                domain: undefined,
                encoding: 'iron',
                password: PASSWORD,
                ignoreErrors: true,
                isHttpOnly: true,
                isSameSite: 'None',
                isSecure: IS_SECURE,
                path: '/',
                ttl: 10000,
            });

            return {
                authenticate: async function (
                    request: Request,
                    h: ResponseToolkit
                ) {
                    try {
                        let config = {};
                        if (!request.query.code && !request.query.error) {
                            //AUTHORIZATION
                            const tenantId = request.query.tenantId;
                            const customerId = request.query.customerId;
                            const mashupAppName = request.query.mashupAppName;
                            const returnTo = request.query.returnTo;

                            const { tenant, mashupApp } =
                                ensureTenantCustomerAnApp(
                                    tenantId,
                                    mashupAppName,
                                    customerId,
                                    tenantRepository
                                );

                            config = getBellConfig(
                                tenant,
                                PASSWORD,
                                IS_SECURE,
                                configService
                            );
                            const callbackUrl = mashupApp.callbackUrl;

                            h.state('helper_sid', {
                                returnTo,
                                callbackUrl,
                                tenantId,
                                customerId,
                                mashupAppName,
                                tokenOptions: tenant.tokenOptions,
                            });
                        } else if (request.query.code) {
                            //AUTHORIZATION CALLBACK
                            const tenantId = request.state.helper_sid.tenantId;

                            if (!tenantId) {
                                throw new Errors.InternalError(
                                    'Missing authorization callback cookie.',
                                    {
                                        state: JSON.stringify(request.state),
                                    }
                                );
                            }

                            const tenant = tenantRepository
                                .getAll()
                                .find((x) => x.id === tenantId);

                            if (!tenant) {
                                throw new Errors.InternalError(
                                    'Tenant not founds.',
                                    {
                                        state: JSON.stringify(request.state),
                                    }
                                );
                            }
                            config = getBellConfig(
                                tenant,
                                PASSWORD,
                                IS_SECURE,
                                configService
                            );
                        } else if (request.query.error) {
                            throw new Errors.InternalError('OAuth error.', {
                                ...request.query,
                            });
                        }

                        return await server.plugins.bell.oauth.v2(config)(
                            request,
                            h
                        );
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
            };
        };
        server.auth.scheme('qlik_multi_idp_scheme', qlikMultiIdpScheme);
        server.auth.strategy(
            QlikStrategies.QlikMultiIdp,
            'qlik_multi_idp_scheme'
        );
    },
};
export { QlikMultiIdp };

function ensureTenantCustomerAnApp(
    tenantId: string,
    mashupAppName: string,
    customerId: string,
    tenantRepository: TenantRepository
) {
    if (!tenantId || !mashupAppName) {
        throw new Error(
            'tenantId or mashupAppName name is missing from query.'
        );
    }
    const tenant = tenantRepository.getAll().find((x) => x.id === tenantId);

    if (!tenant) {
        throw new Error('Tenant not founds.');
    }

    const customer = tenant.customers.find((x) => x.id === customerId);

    if (!customer) {
        throw new Error('Customer not founds.');
    }

    const mashupApp = customer.apps.find((x) => x.name === mashupAppName);

    if (!mashupApp) {
        throw new Error('MashupApp not founds.');
    }
    return { tenant, customer, mashupApp };
}

function getBellConfig(
    tenant: Tenant,
    password: string,
    isSecure: boolean,
    configService: ConfigService
) {
    const location = 'https://' + configService.get('DOMAIN_NAME');
    const result = {
        cookie: 'qc_sid',
        name: 'custom',
        provider: getProviderConfig(tenant),
        password: password,
        clientId: tenant.idProvider.clientId,
        clientSecret: tenant.idProvider.clientSecret,
        isSecure: isSecure,
    };

    if (
        configService.get('NODE_ENV') === 'production' ||
        configService.get('NODE_ENV') === 'staging'
    ) {
        result['location'] = location;
    }

    return result;
}

function getProviderConfig(tenant: Tenant) {
    switch (tenant.idProvider.type) {
        case 'qlikOauth':
            return getQlikOauthProviderConfig(tenant);
        default:
            throw new Error('Not Implemented.');
    }
}

function getQlikOauthProviderConfig(tenant: Tenant) {
    return {
        pkce: 'S256',
        profileMethod: 'get',
        protocol: 'oauth2',
        useParamsAuth: true,
        auth: `https://${tenant.host}/oauth/authorize`,
        token: `https://${tenant.host}/oauth/token`,
        scope: ['user_default'],
        profile: async function (credentials, params, get) {
            const client = axiosClassicInstance(credentials.token);
            const response = await client.get<any>(
                `https://${tenant.host}/api/v1/users/me`
            );

            if (response.status !== 200) {
                throw new Error('Error getting user profile.');
            }

            const profile = response.data;

            credentials.profile = {
                sub: profile.subject,
                subType: 'user',
                name: profile.name,
                status: profile.status,
                email: profile.email,
                groups: profile.groups,
                userId: profile.id,
                email_verified: profile.email_verified,
                roles: profile.roles,
                raw: profile,
            };
        },
    };
}
