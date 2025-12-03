import { Errors } from '../../lib';
import { QlikAuthData } from '../../lib/qlik-auth';
import { TenantRepository } from '../../repositories';
import { IAuthProvider } from './IAuthProvider';
import { QlikAuthType } from './QlikAuthProviderFactory';

export abstract class BaseQAuthProvider implements IAuthProvider {
    constructor(
        type: QlikAuthType,
        protected tenantRepository?: TenantRepository
    ) {
        this.type = type;
    }
    abstract handleLogout(...arg: any[]): Promise<void>;
    readonly type: QlikAuthType;
    abstract ensureQlikUser(...arg: any[]);
    abstract getUserList(userData: QlikAuthData);
    abstract getUserFullList(userData: QlikAuthData);

    protected getActiveRole(roles: string[], headers: any): string {
        if (!roles || !Array.isArray(roles) || !roles[0]) {
            return;
        }

        let activeRole = roles.includes('admin') ? 'admin' : 'user';

        if (headers['x-app-admin'] == 'false') {
            activeRole = 'user';
        }
        return activeRole;
    }

    protected ensureTenantMetadata(headers: any) {
        const tenantId = headers['x-tenant-id'];
        const appName = headers['x-app-name'];
        const customerId = headers['x-customer-id'];

        const tenant = this.tenantRepository
            .getAll()
            .find((x) => x.id === tenantId);

        const customer = tenant.customers.find((x) => x.id === customerId);

        if (!customer) {
            throw new Errors.NotFoundError('Customer not found', {
                tenantId: tenant.id,
                customerId: customerId,
            });
        }
        const app = customer.apps.find(
            (x) => x.id === appName || x.name === appName
        );

        if (!app) {
            throw new Errors.NotFoundError('App not found', {
                tenantId: tenant.id,
                customerId: customer.id,
                appName,
            });
        }
        return { tenant, app, customer };
    }
}
