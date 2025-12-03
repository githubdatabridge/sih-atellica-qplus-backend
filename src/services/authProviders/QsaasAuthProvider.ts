import { autoInjectable, delay, inject } from 'tsyringe';
import { QlikAuthType, QlikSaasService, RoleMapperService } from '..';
import { QlikAuthData } from '../../lib/qlik-auth';
import { TenantRepository } from '../../repositories';
import { BaseQAuthProvider } from './BaseQAuthProvider';
import {
    Customer,
    QlikQsaasUser,
    QsaasUserLight,
    Tenant,
} from '../../entities';
import { jwtTokenDecode } from '../../lib/util';
import { Errors } from '../../lib';
import { JwtPayload } from '../../lib/jwtHelpers';
import { TokenProvider } from '../TokenProvider';

@autoInjectable()
export class QsaasAuthProvider extends BaseQAuthProvider {
    constructor(
        tenantRepository?: TenantRepository,
        @inject(delay(() => QlikSaasService))
        private qlikSaasService?: QlikSaasService,
        @inject(delay(() => RoleMapperService))
        private roleMapperService?: RoleMapperService,
        private tokenProvider?: TokenProvider
    ) {
        super(QlikAuthType.Cloud, tenantRepository);
    }
    async ensureQlikUser(
        state: string,
        headers: string
    ): Promise<QlikAuthData> {
        const { tenant, app, customer } = this.ensureTenantMetadata(headers);

        const result = this.getJwtPayload(headers);

        const spaceRoles = await this.getSpaceRoles(
            result.userId,
            customer.spaceId,
            tenant
        );

        const qlikUser: QlikQsaasUser = {
            status: result.status,
            id: result.userId,
            email: result.email,
            name: result.name,
        };

        const mappedRoles = this.roleMapperService.map(spaceRoles);

        let userData: QlikAuthData = {
            qlikUser: qlikUser,
            user: {
                appUserId: result.userId,
                email: result.email,
                name: result.name,
            },
            activeRole: undefined,
            roles: mappedRoles,
            customerId: customer.id,
            tenantId: tenant.id,
            appId: app.id,
            authProviderType: QlikAuthType.Cloud,
            email: result.email,
            qlikAppIds: app.qlikApps.map((x) => x.id),
        };

        userData.activeRole = this.getActiveRole(userData.roles, headers);

        return userData;
    }

    private async getSpaceRoles(
        userId: string,
        spaceId: string,
        tenant: Tenant
    ) {
        const config = await this.getConfig(tenant);

        let owner = (await this.qlikSaasService.getSpaceOwner(
            spaceId,
            config
        )) as QsaasUserLight;

        if (owner.id === userId) {
            return this.roleMapperService.unmappedRoles();
        }

        const user = (await this.qlikSaasService.getUserById(
            userId,
            spaceId,
            config
        )) as QsaasUserLight;

        if (user.status !== 'active') {
            throw new Errors.ValidationError('User not have active status.', {
                status: user.status,
                userId: user.id,
                tenantId: tenant.id,
            });
        }

        return user.space.roles;
    }

    private async getConfig(tenant: Tenant) {
        const apiKey = tenant.apiKey?.value ||
            (await this.tokenProvider.getAccessToken(
                'https://' + tenant.host,
                tenant.idProvider.clientId,
                tenant.idProvider.clientSecret
            ));

        const config = {
            'x-tenant-id': tenant.id,
            'x-qlik-host': 'https://' + tenant.host,
            'x-qlik-api-key': apiKey,
        };
        return config;
    }

    async getUserList(userData: QlikAuthData): Promise<QlikQsaasUser[]> {
        const tenant = this.tenantRepository
            .getAll()
            .find((x) => x.id === userData.tenantId);

        const customer = tenant.customers.find(
            (x) => x.id === userData.customerId
        );

        const config = await this.getConfig(tenant);

        const response = (await this.qlikSaasService.getUsers(
            customer.spaceId,
            config
        )) as QsaasUserLight[];

        //Adding owner to list of users if not present
        if (!response.some((x) => x.id === userData.user.appUserId)) {
            const owner = (await this.qlikSaasService.getSpaceOwner(
                customer.spaceId,
                config
            )) as QsaasUserLight;

            if (owner.id !== userData.user.appUserId) {
                throw new Errors.InternalError(
                    'Failed to add owner as user in given space.',
                    {
                        ownerId: owner.id,
                        appUserId: userData.user.appUserId,
                    }
                );
            }

            owner.space = {
                id: customer.spaceId,
                roles: this.roleMapperService.unmappedRoles(),
                tenantId: tenant.id,
                type: 'user',
            };

            response.push(owner);
        }

        const qlikUsers: QlikQsaasUser[] = response.map((x) => {
            const mapperdRoles = this.roleMapperService.map(x.space.roles);
            return {
                status: x.status,
                id: x.id,
                email: x.email,
                name: x.name,
                roles: mapperdRoles,
            };
        });

        return qlikUsers;
    }

    async getUserFullList(userData: QlikAuthData): Promise<QlikQsaasUser[]> {
        return await this.getUserList(userData);
    }

    private getJwtPayload(headers: any) {
        const jwt = headers['Authorization'] || headers['authorization'];

        try {
            const result = jwtTokenDecode<JwtPayload>(jwt);
            return result;
        } catch (error) {
            throw new Errors.InternalError(
                'Failed to retrieve email from jwt token.',
                {
                    innerMessage: error.message ? error.message : 'NONE',
                    token: jwt,
                }
            );
        }
    }

    handleLogout(...arg: any[]): Promise<void> {
        ///For future implementation where Qlik and mechanize for logout
        throw new Error('Method not implemented.');
    }
}
