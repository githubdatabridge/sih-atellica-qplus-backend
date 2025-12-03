import { autoInjectable, delay, inject } from 'tsyringe';
import { QlikAuthProviderFactory } from '.';
import { AppUser } from '../entities/AppUser';
import { QlikAuthData, QlikUser } from '../lib/qlik-auth';

@autoInjectable()
export class UserService {
    constructor(
        @inject(delay(() => QlikAuthProviderFactory))
        private providerFactory?: QlikAuthProviderFactory
    ) {}

    async validateUserList(
        userData: QlikAuthData,
        usersIds: string[]
    ): Promise<{ validUsers: AppUser[]; invalid: string[] }> {
        const provider = this.providerFactory.create(userData.tenantId);
        const users: QlikUser[] = await provider.getUserFullList(userData);

        const valid: string[] = [];
        const invalid: string[] = [];

        usersIds.forEach((u) => {
            if (users.some((x) => x.id === u)) {
                valid.push(u);
            } else {
                invalid.push(u);
            }
        });

        const validUsers = await this.getUsersInfo(valid, userData, users);
        return { validUsers, invalid };
    }

    async getUsersInfo(
        userIds: string[],
        userData: QlikAuthData,
        users?: QlikUser[]
    ) {
        const provider = this.providerFactory.create(userData.tenantId);
        if (!users) {
            users = await provider.getUserFullList(userData);
        }

        return users
            .filter((qu) => userIds.includes(qu.id))
            .map((qu) => {
                const result: AppUser = {
                    appUserId: qu.id,
                    name: qu.name,
                    email: qu.email,
                };
                return result;
            });
    }

    async getAllUsersInfo(userData: QlikAuthData) {
        const provider = this.providerFactory.create(userData.tenantId);
        const users = await provider.getUserFullList(userData);

        return users.map((qu) => {
            const result: AppUser = {
                appUserId: qu.id,
                name: qu.name,
                email: qu.email,
            };
            return result;
        });
    }
}
