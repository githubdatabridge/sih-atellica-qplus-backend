import { container, injectable, registry } from 'tsyringe';
import { Errors } from '../../lib';
import { TenantRepository } from '../../repositories';
import { IAuthProvider } from './IAuthProvider';
import { QesAuthProvider } from './QesAuthProvider';
import { QsaasAuthProvider } from './QsaasAuthProvider';

export enum QlikAuthType {
    Windows = 'windows',
    Cloud = 'cloud',
}

@registry([
    {
        token: QlikAuthType.Windows,
        useClass: QesAuthProvider,
    },
    {
        token: QlikAuthType.Cloud,
        useClass: QsaasAuthProvider,
    },
])
@injectable()
export class QlikAuthProviderFactory {
    constructor(private tenantRepository?: TenantRepository) {}
    create(tenantId: string): IAuthProvider {
        const tenant = this.tenantRepository
            .getAll()
            .find((x) => x.id === tenantId);

        if (!tenant) {
            throw new Errors.NotFoundError(
                'Tenant with given tenantId not found.',
                {
                    tenantId,
                }
            );
        }

        return container.resolve(tenant.authType);
    }
}
