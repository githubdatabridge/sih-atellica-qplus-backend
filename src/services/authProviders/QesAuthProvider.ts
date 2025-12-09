import { autoInjectable, delay, inject } from 'tsyringe';
import { ConfigService, QlikAuthType, QlikService } from '..';
import { QlikQesUser, Tenant } from '../../entities';
import { AppUser } from '../../entities/AppUser';
import { Errors } from '../../lib';
import { QlikAuthData, QlikUser } from '../../lib/qlik-auth';
import { TenantRepository } from '../../repositories';

import { BaseQAuthProvider } from './BaseQAuthProvider';
import { ENV_PARAMS } from '../ConfigService';

@autoInjectable()
export class QesAuthProvider extends BaseQAuthProvider {
    constructor(
        @inject(delay(() => QlikService)) private qlikService?: QlikService,
        private configService?: ConfigService,
        tenantRepository?: TenantRepository
    ) {
        super(QlikAuthType.Windows, tenantRepository);
    }

    async getUserList(userData: QlikAuthData): Promise<QlikQesUser[]> {
        const tenant = this.tenantRepository
            .getAll()
            .find((x) => x.id === userData.tenantId);

        return await this._getUserList(userData.qlikAppId, userData.vp, tenant);
    }

    async getUserFullList(userData: QlikAuthData): Promise<QlikUser[]> {
        try {
            let appName = userData.appId;
            const tenant = this.tenantRepository
                .getAll()
                .find((x) => x.id === userData.tenantId);
            const emailName = `${appName}_email`;
            // const qlikUsers = await qlikService.getUserFullList(qlikAppId, {
            //     qsInfo: getQsInfo(configService, vp),
            //     customProperties: [
            //         {
            //             key: 'email',
            //             name: emailName,
            //         },
            //     ],
            // });
            //Replace this code with code above when qlik add email as custom property
            const qlikUsers = await this.qlikService.getUserList(
                userData.qlikAppId,
                {
                    qsInfo: this.getQsInfo(tenant, userData.vp),
                }
            );

            if (!qlikUsers) {
                throw new Errors.Unauthorized('Unauthorized', {
                    qlikAppId: userData.qlikAppId,
                });
            }
            const result = qlikUsers.map((qlikeUser) => {
                let withProp: QlikQesUser = {
                    ...qlikeUser,
                    ...this.getEmailData(qlikeUser, appName),
                };
                if (withProp.customProperties) {
                    delete withProp.customProperties;
                }

                return withProp;
            });

            return result;
        } catch (e) {
            throw new Errors.Unauthorized('Unauthorized', {
                qlikAppId: userData.qlikAppId,
            });
        }
    }

    async ensureQlikUser(state: any, headers: any): Promise<QlikAuthData> {
        const { tenant, app, customer } = this.ensureTenantMetadata(headers);

        const qlikSessionHeader = this.tenantRepository.getSessionHeaders(
            tenant.authType
        )[0];

        const qlikAppName = `${app.id}`;
        const vp = headers['x-vp'];

        const qlikSessionId = state[`${qlikSessionHeader}-${vp}`];

        if (!qlikAppName) {
            throw new Errors.NotFoundError('App not found', {
                qlikSessionId,
                qlikAppName,
            });
        }

        try {
            const qlikAppIds = await this.qlikService.getAppsByFilter(
                `((publishTime ne '1753-01-01T00:00:00.000Z') and tags.name so '${qlikAppName}')`,
                {
                    qsInfo: this.getQsInfo(tenant, vp),
                }
            );

            if (!qlikAppIds || !qlikAppIds.length) {
                throw new Errors.InternalError('No Qlik Apps Found', {
                    qlikSessionId,
                    qlikAppName,
                });
            }

            if (qlikAppIds.length > 1) {
                throw new Errors.AlreadyExistsError(
                    'Multiple QlikApps Exists',
                    {
                        qlikAppIds,
                        qlikSessionId,
                        qlikAppName,
                    }
                );
            }

            const qlikUser: QlikQesUser = await this.getUserBySessionId(
                qlikSessionId,
                app.id,
                vp,
                tenant
            );

            const appUserList: QlikQesUser[] = await this._getUserList(
                qlikAppIds[0],
                vp,
                tenant
            );

            const foundUser = appUserList.find((u) => u.id === qlikUser.id);

            if (!foundUser) {
                throw new Errors.Unauthorized('Qlik App Id Invalid', {
                    qlikAppId: qlikAppIds[0],
                    qlikAppIds,
                    qlikSessionId,
                });
            }

            const authorizationData = this.getAuthorizationData(
                qlikUser,
                app.id
            );

            const userData: QlikAuthData = {
                qlikUser: qlikUser,
                user: this.getAuthUser(qlikUser, authorizationData.email),
                customerId: customer.id,
                tenantId: tenant.id,
                qlikAppId: qlikAppIds[0],
                roles: authorizationData.roles,
                scopes: authorizationData.scopes,
                email: authorizationData.email,
                qlikAppName,
                vp,
                activeRole: null,
                authProviderType: QlikAuthType.Windows,
                appId: app.id,
                qlikAppIds: app.qlikApps.map((x) => x.id),
            };

            userData.activeRole = this.getActiveRole(userData.roles, headers);

            return userData;
        } catch (e) {
            throw new Errors.Unauthorized('Unauthorized', {
                qlikSessionId,
                qlikAppName,
            });
        }
    }

    private getQsInfo(tenant: Tenant, vp: string) {
        return {
            host: tenant.host,
            qrsPort: tenant.port,
            vp,
        };
    }

    private getAuthUser(qlikUser: QlikUser, email: string): AppUser {
        return {
            appUserId: qlikUser.id,
            name: qlikUser.name,
            email: email,
        };
    }

    private async _getUserList(
        qlikAppId: string,
        vp: string,
        tenant: Tenant
    ): Promise<QlikQesUser[]> {
        try {
            const qlikUsers = await this.qlikService.getUserList(qlikAppId, {
                qsInfo: this.getQsInfo(tenant, vp),
            });

            if (!qlikUsers) {
                throw new Errors.Unauthorized('Unauthorized', {
                    qlikAppId,
                });
            }

            return qlikUsers;
        } catch (e) {
            throw new Errors.Unauthorized('Unauthorized', {
                qlikAppId,
            });
        }
    }

    private getAuthorizationData(qlikUser: QlikQesUser, appName: string) {
        let roles = this.configService.get(ENV_PARAMS.DEFAULT_ROLES, false, true) as string[],
            scopes = this.configService.get(ENV_PARAMS.DEFAULT_SCOPES, false, true) as string[],
            email = '';

        const rolesName = `${appName}_role`;
        const scopesName = `${appName}_scopes`;
        const emailName = `${appName}_email`;
        // const pagesName = `${qlikAppName}_pages`;
        qlikUser.customProperties.forEach((x) => {
            if (x.name === rolesName) {
                roles.push(...x.values);
                roles = [...new Set(roles)];
            } else if (x.name === scopesName) {
                scopes.push(...x.values);
                scopes = [...new Set(scopes)];
            } else if (
                x.name === emailName &&
                x.values &&
                Array.isArray(x.values) &&
                x.values[0]
            ) {
                email = x.values[0];
            }
        });

        return {
            roles,
            scopes,
            email,
        };
    }

    private getEmailData(qlikUser: QlikQesUser, appName: string) {
        let email = '';
        const emailName = `${appName}_email`;

        if (qlikUser.customProperties) {
            qlikUser.customProperties.forEach((x) => {
                if (
                    x.name === emailName &&
                    x.values &&
                    Array.isArray(x.values) &&
                    x.values[0]
                ) {
                    email = x.values[0];
                }
            });
        }

        return {
            email,
        };
    }

    private async getUserBySessionId(
        qlikSessionId: string,
        appName: string,
        vp: string,
        tenant: Tenant
    ): Promise<QlikQesUser> {
        try {
            const rolesName = `${appName}_role`;
            const scopesName = `${appName}_scopes`;
            const pagesName = `${appName}_pages`;
            const emailName = `${appName}_email`;

            const qlikUser = await this.qlikService.getUserBySessionId(
                qlikSessionId,
                {
                    qsInfo: this.getQsInfo(tenant, vp),
                    customProperties: [
                        {
                            key: 'roles',
                            name: rolesName,
                        },
                        {
                            key: 'scopes',
                            name: scopesName,
                        },
                        {
                            key: 'email',
                            name: emailName,
                        },
                    ],
                }
            );

            if (!qlikUser) {
                throw new Errors.Unauthorized('Unauthorized', {
                    qlikSessionId,
                });
            }

            return qlikUser;
        } catch (e) {
            throw new Errors.Unauthorized('Unauthorized', {
                qlikSessionId,
            });
        }
    }

    async handleLogout(
        vp: string,
        sessionId: string,
        tenantId: string
    ): Promise<void> {
        const tenant = this.tenantRepository
            .getAll()
            .find((x) => x.id === tenantId);

        const qlikSessionId = sessionId;

        if (!qlikSessionId) {
            throw new Errors.InternalError('User session not terminated.', {
                tenantId,
            });
        }

        const info = this.getQsInfo(tenant, vp);

        var result = await this.qlikService.endUserSession(qlikSessionId, {
            qsInfo: info,
        });

        if (!result) {
            throw new Errors.InternalError('User session not terminated.', {
                qlikSessionId,
            });
        }

        return;
    }
}
