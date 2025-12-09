import { KnexService } from '../services';
import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { Tenant } from '../entities';

@injectable()
export class TenantDataRepository extends BaseRepository<{
    id?: number;
    data?: { array: Tenant[] };
}> {
    constructor(private knexService?: KnexService) {
        super(knexService, 'tenants');
    }
}
